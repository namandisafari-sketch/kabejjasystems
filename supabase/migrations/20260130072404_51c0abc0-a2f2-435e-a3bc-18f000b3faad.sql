-- =====================================================
-- INTELLIGENT STUDENT LIFECYCLE MANAGEMENT SYSTEM
-- =====================================================

-- 1. Extend students table with lifecycle fields
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'graduated', 'transferred', 'suspended', 'pending_decision')),
ADD COLUMN IF NOT EXISTS withdrawal_date DATE,
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_type TEXT CHECK (withdrawal_type IN ('automatic', 'manual', 'transfer', 'expulsion')),
ADD COLUMN IF NOT EXISTS consecutive_absence_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attendance_date DATE,
ADD COLUMN IF NOT EXISTS promotion_status TEXT CHECK (promotion_status IN ('pending', 'promoted', 'retained', 'conditional', 'pending_review')),
ADD COLUMN IF NOT EXISTS promotion_conditions TEXT,
ADD COLUMN IF NOT EXISTS promoted_from_class_id UUID REFERENCES public.school_classes(id),
ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'regular' CHECK (enrollment_type IN ('regular', 'late', 'transfer', 'returning'));

-- 2. Withdrawal Settings (per school)
CREATE TABLE IF NOT EXISTS public.withdrawal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  absence_threshold_days INTEGER NOT NULL DEFAULT 45,
  minimum_attendance_window_days INTEGER DEFAULT 14,
  exclude_holidays BOOLEAN DEFAULT true,
  auto_void_fees BOOLEAN DEFAULT true,
  require_dos_approval BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 3. Promotion Rules (per class per term)
CREATE TABLE IF NOT EXISTS public.promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('gpa_threshold', 'subject_based', 'aggregate_score', 'subject_failure_count')),
  -- GPA-based settings
  minimum_gpa NUMERIC(3,2),
  gpa_scale NUMERIC(3,1) DEFAULT 5.0,
  -- Subject-based settings (stored as JSONB: [{subject_id, min_grade}])
  subject_requirements JSONB,
  -- Aggregate score settings
  minimum_aggregate_percentage NUMERIC(5,2),
  -- Subject failure settings
  max_failed_subjects INTEGER,
  mandatory_pass_subjects JSONB, -- Array of subject_ids that must be passed
  -- Action settings
  non_qualifying_action TEXT DEFAULT 'manual_decision' CHECK (non_qualifying_action IN ('auto_retain', 'manual_decision', 'parent_meeting', 'optional_withdrawal')),
  is_active BOOLEAN DEFAULT true,
  apply_to_all_classes BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Promotion Decisions (individual student decisions)
CREATE TABLE IF NOT EXISTS public.promotion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES public.school_classes(id),
  to_class_id UUID REFERENCES public.school_classes(id),
  decision_type TEXT NOT NULL CHECK (decision_type IN ('promoted', 'retained', 'conditional_promotion', 'withdrawn', 'transferred', 'pending_review', 'pending_parent_meeting')),
  decision_reason TEXT,
  conditions TEXT, -- For conditional promotions
  conditions_met BOOLEAN,
  conditions_met_date DATE,
  gpa_at_decision NUMERIC(3,2),
  aggregate_score_at_decision NUMERIC(5,2),
  failed_subjects JSONB, -- Array of subject names/ids that were failed
  qualifying_criteria_met BOOLEAN DEFAULT false,
  override_applied BOOLEAN DEFAULT false,
  override_reason TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  parent_notified BOOLEAN DEFAULT false,
  parent_notified_at TIMESTAMPTZ,
  parent_acknowledged BOOLEAN DEFAULT false,
  parent_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Student Fee Voids (for tracking voided fees)
CREATE TABLE IF NOT EXISTS public.student_fee_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE,
  original_amount NUMERIC(12,2) NOT NULL,
  voided_amount NUMERIC(12,2) NOT NULL,
  void_reason TEXT NOT NULL,
  void_type TEXT NOT NULL CHECK (void_type IN ('withdrawal', 'transfer', 'expulsion', 'write_off', 'adjustment')),
  related_withdrawal_date DATE,
  voided_by UUID REFERENCES auth.users(id),
  voided_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Absence Alerts (for tracking chronic absentees before withdrawal)
CREATE TABLE IF NOT EXISTS public.absence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical', 'auto_withdrawn')),
  consecutive_days INTEGER NOT NULL,
  threshold_days INTEGER NOT NULL,
  last_present_date DATE,
  alert_message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. School Holidays (for excluding from absence calculations)
CREATE TABLE IF NOT EXISTS public.school_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_type TEXT DEFAULT 'general' CHECK (holiday_type IN ('general', 'term_break', 'public_holiday', 'special')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Student Lifecycle Audit Log
CREATE TABLE IF NOT EXISTS public.student_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on all new tables
ALTER TABLE public.withdrawal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_voids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lifecycle_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawal_settings
CREATE POLICY "Users can view own tenant withdrawal settings" ON public.withdrawal_settings
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own tenant withdrawal settings" ON public.withdrawal_settings
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for promotion_rules
CREATE POLICY "Users can view own tenant promotion rules" ON public.promotion_rules
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own tenant promotion rules" ON public.promotion_rules
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for promotion_decisions
CREATE POLICY "Users can view own tenant promotion decisions" ON public.promotion_decisions
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own tenant promotion decisions" ON public.promotion_decisions
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for student_fee_voids
CREATE POLICY "Users can view own tenant fee voids" ON public.student_fee_voids
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own tenant fee voids" ON public.student_fee_voids
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for absence_alerts
CREATE POLICY "Users can view own tenant absence alerts" ON public.absence_alerts
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own tenant absence alerts" ON public.absence_alerts
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for school_holidays
CREATE POLICY "Users can view own tenant holidays" ON public.school_holidays
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own tenant holidays" ON public.school_holidays
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for student_lifecycle_logs
CREATE POLICY "Users can view own tenant lifecycle logs" ON public.student_lifecycle_logs
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant lifecycle logs" ON public.student_lifecycle_logs
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Function to void student fees on withdrawal
CREATE OR REPLACE FUNCTION public.void_student_fees_on_withdrawal(
  p_student_id UUID,
  p_tenant_id UUID,
  p_void_reason TEXT,
  p_void_type TEXT,
  p_voided_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_voided NUMERIC := 0;
  v_fee_record RECORD;
  v_void_count INTEGER := 0;
BEGIN
  -- Find all outstanding fees for this student
  FOR v_fee_record IN 
    SELECT id, balance, total_amount 
    FROM student_fees 
    WHERE student_id = p_student_id 
    AND tenant_id = p_tenant_id 
    AND balance > 0
    AND status != 'paid'
  LOOP
    -- Create void record
    INSERT INTO student_fee_voids (
      tenant_id, student_id, student_fee_id,
      original_amount, voided_amount, void_reason,
      void_type, related_withdrawal_date, voided_by
    ) VALUES (
      p_tenant_id, p_student_id, v_fee_record.id,
      v_fee_record.total_amount, v_fee_record.balance, p_void_reason,
      p_void_type, CURRENT_DATE, p_voided_by
    );
    
    -- Update the fee record to mark as voided
    UPDATE student_fees 
    SET status = 'voided', 
        balance = 0,
        updated_at = now()
    WHERE id = v_fee_record.id;
    
    v_total_voided := v_total_voided + v_fee_record.balance;
    v_void_count := v_void_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_voided', v_total_voided,
    'void_count', v_void_count
  );
END;
$$;

-- Function to process student withdrawal
CREATE OR REPLACE FUNCTION public.process_student_withdrawal(
  p_student_id UUID,
  p_tenant_id UUID,
  p_withdrawal_type TEXT,
  p_withdrawal_reason TEXT,
  p_performed_by UUID,
  p_auto_void_fees BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_status TEXT;
  v_void_result JSONB;
BEGIN
  -- Get current status
  SELECT status INTO v_previous_status 
  FROM students 
  WHERE id = p_student_id AND tenant_id = p_tenant_id;
  
  IF v_previous_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;
  
  -- Update student status
  UPDATE students SET
    status = 'withdrawn',
    is_active = false,
    withdrawal_date = CURRENT_DATE,
    withdrawal_reason = p_withdrawal_reason,
    withdrawal_type = p_withdrawal_type,
    updated_at = now()
  WHERE id = p_student_id AND tenant_id = p_tenant_id;
  
  -- Void outstanding fees if enabled
  IF p_auto_void_fees THEN
    SELECT public.void_student_fees_on_withdrawal(
      p_student_id, p_tenant_id, 
      'Student withdrawal: ' || p_withdrawal_reason,
      p_withdrawal_type,
      p_performed_by
    ) INTO v_void_result;
  END IF;
  
  -- Log the action
  INSERT INTO student_lifecycle_logs (
    tenant_id, student_id, action_type,
    previous_status, new_status, details, performed_by
  ) VALUES (
    p_tenant_id, p_student_id, 'withdrawal',
    v_previous_status, 'withdrawn',
    jsonb_build_object(
      'withdrawal_type', p_withdrawal_type,
      'reason', p_withdrawal_reason,
      'fees_voided', COALESCE((v_void_result->>'total_voided')::NUMERIC, 0)
    ),
    p_performed_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_previous_status,
    'fees_voided', COALESCE(v_void_result, '{}'::jsonb)
  );
END;
$$;

-- Function to check and update absence-based withdrawals
CREATE OR REPLACE FUNCTION public.check_absence_withdrawals(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_student RECORD;
  v_withdrawn_count INTEGER := 0;
  v_alerted_count INTEGER := 0;
BEGIN
  -- Get withdrawal settings
  SELECT * INTO v_settings 
  FROM withdrawal_settings 
  WHERE tenant_id = p_tenant_id;
  
  IF v_settings IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No withdrawal settings configured');
  END IF;
  
  -- Process each active student
  FOR v_student IN 
    SELECT s.id, s.full_name, s.consecutive_absence_days, s.last_attendance_date
    FROM students s
    WHERE s.tenant_id = p_tenant_id 
    AND s.is_active = true
    AND s.status = 'active'
    AND s.consecutive_absence_days >= v_settings.absence_threshold_days
  LOOP
    -- Auto-withdraw if threshold exceeded
    PERFORM public.process_student_withdrawal(
      v_student.id,
      p_tenant_id,
      'automatic',
      'Exceeded absence threshold of ' || v_settings.absence_threshold_days || ' days',
      NULL,
      v_settings.auto_void_fees
    );
    
    -- Create alert record
    INSERT INTO absence_alerts (
      tenant_id, student_id, alert_type,
      consecutive_days, threshold_days, last_present_date,
      alert_message
    ) VALUES (
      p_tenant_id, v_student.id, 'auto_withdrawn',
      v_student.consecutive_absence_days, v_settings.absence_threshold_days,
      v_student.last_attendance_date,
      'Student automatically withdrawn after ' || v_student.consecutive_absence_days || ' days of absence'
    );
    
    v_withdrawn_count := v_withdrawn_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'withdrawn_count', v_withdrawn_count,
    'threshold_days', v_settings.absence_threshold_days
  );
END;
$$;

-- Function to process student promotions
CREATE OR REPLACE FUNCTION public.process_student_promotions(
  p_tenant_id UUID,
  p_term_id UUID,
  p_class_id UUID,
  p_performed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules RECORD;
  v_student RECORD;
  v_decision_type TEXT;
  v_meets_criteria BOOLEAN;
  v_processed_count INTEGER := 0;
  v_promoted_count INTEGER := 0;
  v_retained_count INTEGER := 0;
  v_pending_count INTEGER := 0;
BEGIN
  -- Get active promotion rules for this class/term
  FOR v_rules IN 
    SELECT * FROM promotion_rules 
    WHERE tenant_id = p_tenant_id 
    AND (class_id = p_class_id OR apply_to_all_classes = true)
    AND (term_id = p_term_id OR term_id IS NULL)
    AND is_active = true
    ORDER BY rule_type
  LOOP
    -- Process each student in the class
    FOR v_student IN 
      SELECT s.id, s.full_name
      FROM students s
      WHERE s.tenant_id = p_tenant_id 
      AND s.class_id = p_class_id
      AND s.is_active = true
      AND s.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM promotion_decisions pd 
        WHERE pd.student_id = s.id 
        AND pd.term_id = p_term_id
      )
    LOOP
      -- Default to pending review
      v_decision_type := 'pending_review';
      v_meets_criteria := false;
      
      -- Create decision record for review
      INSERT INTO promotion_decisions (
        tenant_id, student_id, term_id, from_class_id,
        decision_type, qualifying_criteria_met
      ) VALUES (
        p_tenant_id, v_student.id, p_term_id, p_class_id,
        v_decision_type, v_meets_criteria
      );
      
      v_processed_count := v_processed_count + 1;
      v_pending_count := v_pending_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'promoted_count', v_promoted_count,
    'retained_count', v_retained_count,
    'pending_count', v_pending_count
  );
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_consecutive_absence ON public.students(tenant_id, consecutive_absence_days) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_decisions_student_term ON public.promotion_decisions(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_absence_alerts_student ON public.absence_alerts(tenant_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_fee_voids_student ON public.student_fee_voids(tenant_id, student_id);

-- Update student_fees table to support voiding
ALTER TABLE public.student_fees 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'voided', 'waived'));