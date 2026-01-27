-- =============================================
-- BURSAR RED LIST & GATE CONTROL SYSTEM
-- =============================================

-- Table for bursar-defined blocking rules
CREATE TABLE IF NOT EXISTS public.bursar_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('balance_threshold', 'missing_requirement', 'custom')),
  -- For balance rules
  balance_operator TEXT CHECK (balance_operator IN ('>=', '>', '=', '<', '<=')),
  balance_amount NUMERIC,
  -- For class-specific rules (null means all classes)
  class_id UUID REFERENCES public.school_classes(id) ON DELETE CASCADE,
  -- For requirement rules
  requirement_id UUID REFERENCES public.term_requirements(id) ON DELETE CASCADE,
  -- Custom conditions (JSON for flexibility)
  custom_conditions JSONB,
  -- Rule settings
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  alert_message TEXT DEFAULT 'Student is on the bursar''s red list',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for students explicitly added to red list (manual additions)
CREATE TABLE IF NOT EXISTS public.student_red_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.bursar_rules(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  blocked_by UUID REFERENCES auth.users(id),
  -- Resolved when cleared
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, student_id, rule_id) 
);

-- Table for gate override requests
CREATE TABLE IF NOT EXISTS public.gate_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- The blocking reason at time of request
  blocking_reason TEXT NOT NULL,
  -- Gateman's override reason
  override_reason TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  -- Approval status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Approval details
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  -- If approved, allow entry for this date only
  valid_for_date DATE DEFAULT CURRENT_DATE,
  -- Link to the resulting checkin if approved
  gate_checkin_id UUID REFERENCES public.gate_checkins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to gate_checkins for tracking blocked attempts
ALTER TABLE public.gate_checkins 
ADD COLUMN IF NOT EXISTS was_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_request_id UUID REFERENCES public.gate_override_requests(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.bursar_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_red_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_override_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bursar_rules
CREATE POLICY "Tenant users can view bursar rules" 
ON public.bursar_rules FOR SELECT 
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant owners can manage bursar rules" 
ON public.bursar_rules FOR ALL 
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- RLS Policies for student_red_list
CREATE POLICY "Tenant users can view red list" 
ON public.student_red_list FOR SELECT 
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant owners can manage red list" 
ON public.student_red_list FOR ALL 
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- RLS Policies for gate_override_requests
CREATE POLICY "Tenant users can view override requests" 
ON public.gate_override_requests FOR SELECT 
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant users can manage override requests" 
ON public.gate_override_requests FOR ALL 
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- Function to check if a student is on the red list based on rules
CREATE OR REPLACE FUNCTION public.check_student_red_list_status(p_student_id UUID, p_tenant_id UUID)
RETURNS TABLE (
  is_blocked BOOLEAN,
  blocking_reasons TEXT[],
  rule_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_reasons TEXT[] := '{}';
  v_rule_ids UUID[] := '{}';
  v_rule RECORD;
  v_balance NUMERIC;
  v_requirement RECORD;
BEGIN
  -- Get student info with fee balance
  SELECT s.*, COALESCE(sf.balance, 0) as fee_balance
  INTO v_student
  FROM students s
  LEFT JOIN student_fees sf ON sf.student_id = s.id AND sf.tenant_id = s.tenant_id
  WHERE s.id = p_student_id AND s.tenant_id = p_tenant_id;

  IF v_student IS NULL THEN
    RETURN QUERY SELECT false, '{}'::TEXT[], '{}'::UUID[];
    RETURN;
  END IF;

  -- Check manual red list entries first
  FOR v_rule IN 
    SELECT id, reason FROM student_red_list 
    WHERE student_id = p_student_id 
    AND tenant_id = p_tenant_id 
    AND is_resolved = false
  LOOP
    v_reasons := array_append(v_reasons, v_rule.reason);
    v_rule_ids := array_append(v_rule_ids, v_rule.id);
  END LOOP;

  -- Check balance threshold rules
  FOR v_rule IN 
    SELECT * FROM bursar_rules 
    WHERE tenant_id = p_tenant_id 
    AND is_active = true 
    AND rule_type = 'balance_threshold'
    AND (class_id IS NULL OR class_id = v_student.class_id)
  LOOP
    v_balance := v_student.fee_balance;
    
    IF (v_rule.balance_operator = '>=' AND v_balance >= v_rule.balance_amount) OR
       (v_rule.balance_operator = '>' AND v_balance > v_rule.balance_amount) OR
       (v_rule.balance_operator = '=' AND v_balance = v_rule.balance_amount) THEN
      v_reasons := array_append(v_reasons, COALESCE(v_rule.alert_message, 'Fee balance exceeds threshold'));
      v_rule_ids := array_append(v_rule_ids, v_rule.id);
    END IF;
  END LOOP;

  -- Check missing requirement rules
  FOR v_rule IN 
    SELECT br.*, tr.name as req_name FROM bursar_rules br
    JOIN term_requirements tr ON tr.id = br.requirement_id
    WHERE br.tenant_id = p_tenant_id 
    AND br.is_active = true 
    AND br.rule_type = 'missing_requirement'
  LOOP
    -- Check if student has fulfilled this requirement
    IF NOT EXISTS (
      SELECT 1 FROM student_requirements sr 
      WHERE sr.student_id = p_student_id 
      AND sr.requirement_id = v_rule.requirement_id 
      AND sr.is_fulfilled = true
    ) THEN
      v_reasons := array_append(v_reasons, COALESCE(v_rule.alert_message, 'Missing requirement: ' || v_rule.req_name));
      v_rule_ids := array_append(v_rule_ids, v_rule.id);
    END IF;
  END LOOP;

  RETURN QUERY SELECT 
    array_length(v_reasons, 1) > 0,
    v_reasons,
    v_rule_ids;
END;
$$;

-- Trigger to create parent notification when student is blocked at gate
CREATE OR REPLACE FUNCTION public.notify_parent_on_gate_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
BEGIN
  -- Only notify on new blocked override requests
  IF NEW.status = 'pending' THEN
    SELECT s.full_name, s.tenant_id INTO v_student
    FROM students s WHERE s.id = NEW.student_id;

    IF v_student IS NOT NULL THEN
      INSERT INTO parent_notifications (tenant_id, parent_id, student_id, type, title, message, metadata)
      SELECT 
        v_student.tenant_id,
        ps.parent_id,
        NEW.student_id,
        'gate_blocked',
        '🚫 ' || v_student.full_name || ' was blocked at gate',
        'Reason: ' || NEW.blocking_reason || '. Please contact the school to resolve.',
        jsonb_build_object(
          'override_request_id', NEW.id,
          'blocking_reason', NEW.blocking_reason,
          'requested_at', NEW.requested_at
        )
      FROM parent_students ps
      WHERE ps.student_id = NEW.student_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_parent_on_gate_block
AFTER INSERT ON public.gate_override_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_parent_on_gate_block();

-- Enable realtime for override requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_override_requests;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bursar_rules_tenant ON public.bursar_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_red_list_student ON public.student_red_list(student_id);
CREATE INDEX IF NOT EXISTS idx_student_red_list_tenant ON public.student_red_list(tenant_id);
CREATE INDEX IF NOT EXISTS idx_override_requests_student ON public.gate_override_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_override_requests_status ON public.gate_override_requests(status);
CREATE INDEX IF NOT EXISTS idx_override_requests_date ON public.gate_override_requests(valid_for_date);