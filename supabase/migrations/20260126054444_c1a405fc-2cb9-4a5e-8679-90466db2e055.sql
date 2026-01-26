-- Create notifications table for parent-school communication
CREATE TABLE public.parent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general', -- arrival, departure, announcement, fee_reminder, discipline
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_parent_notifications_parent ON public.parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_unread ON public.parent_notifications(parent_id, is_read) WHERE is_read = false;
CREATE INDEX idx_parent_notifications_created ON public.parent_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- Parents can view their own notifications
CREATE POLICY "Parents can view their own notifications"
  ON public.parent_notifications FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

-- Parents can update their own notifications (mark as read)
CREATE POLICY "Parents can update their own notifications"
  ON public.parent_notifications FOR UPDATE
  USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

-- School staff can insert notifications
CREATE POLICY "Staff can insert notifications"
  ON public.parent_notifications FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_notifications;

-- Create function to auto-notify parents on student check-in
CREATE OR REPLACE FUNCTION public.notify_parent_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_parent RECORD;
  v_check_time TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Get student info
  SELECT s.full_name, s.tenant_id INTO v_student
  FROM public.students s
  WHERE s.id = NEW.student_id;

  IF v_student IS NULL THEN
    RETURN NEW;
  END IF;

  -- Format time
  v_check_time := TO_CHAR(NEW.checked_at AT TIME ZONE 'Africa/Kampala', 'h:MI AM');

  -- Build notification content based on check type
  IF NEW.check_type = 'arrival' THEN
    v_title := '🎒 ' || v_student.full_name || ' arrived at school';
    IF NEW.is_late THEN
      v_message := 'Checked in late at ' || v_check_time;
    ELSE
      v_message := 'Checked in at ' || v_check_time;
    END IF;
  ELSIF NEW.check_type = 'departure' THEN
    v_title := '🏠 ' || v_student.full_name || ' is ready for pickup';
    v_message := 'Checked out at ' || v_check_time;
  ELSE
    RETURN NEW;
  END IF;

  -- Insert notification for each linked parent
  INSERT INTO public.parent_notifications (tenant_id, parent_id, student_id, type, title, message, metadata)
  SELECT 
    v_student.tenant_id,
    ps.parent_id,
    NEW.student_id,
    NEW.check_type,
    v_title,
    v_message,
    jsonb_build_object(
      'checkin_id', NEW.id,
      'is_late', NEW.is_late,
      'checked_at', NEW.checked_at
    )
  FROM public.parent_students ps
  WHERE ps.student_id = NEW.student_id;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-notifications
CREATE TRIGGER trigger_notify_parent_on_checkin
  AFTER INSERT ON public.gate_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_checkin();