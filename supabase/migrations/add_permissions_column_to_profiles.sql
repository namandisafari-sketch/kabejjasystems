-- Add permissions column to profiles table for exam import access control
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON profiles USING gin(permissions);

-- Add comment explaining the column
COMMENT ON COLUMN profiles.permissions IS 'JSONB column for storing user permissions. Example: {"exam_import_access": true}';
