-- Add comment field to ecd_activity_ratings for teacher comments on learning activities
ALTER TABLE public.ecd_activity_ratings 
ADD COLUMN IF NOT EXISTS comment text;