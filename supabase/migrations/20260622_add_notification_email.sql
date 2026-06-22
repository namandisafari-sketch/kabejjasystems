-- Add notification_email column for secondary email (notifications, announcements, etc.)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_notification_email ON public.students(notification_email);

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.students.notification_email IS 'Secondary email for receiving notifications, grades, announcements. Can be personal email like Gmail, Yahoo, etc.';
