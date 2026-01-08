-- Add class_rank column to ecd_report_cards
ALTER TABLE public.ecd_report_cards 
ADD COLUMN IF NOT EXISTS class_rank integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_students_in_class integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS head_teacher_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS head_teacher_comment text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS average_score numeric(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_prefect boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_attendance jsonb DEFAULT '[]'::jsonb;

-- Add numeric_score to ecd_learning_ratings for calculations
ALTER TABLE public.ecd_learning_ratings 
ADD COLUMN IF NOT EXISTS numeric_score integer DEFAULT NULL;

-- Add unique constraint for upsert on learning ratings
ALTER TABLE public.ecd_learning_ratings 
DROP CONSTRAINT IF EXISTS ecd_learning_ratings_report_area_unique;
ALTER TABLE public.ecd_learning_ratings 
ADD CONSTRAINT ecd_learning_ratings_report_area_unique UNIQUE (report_card_id, learning_area_id);

-- Add unique constraint for upsert on skills ratings  
ALTER TABLE public.ecd_skills_ratings 
DROP CONSTRAINT IF EXISTS ecd_skills_ratings_report_skill_unique;
ALTER TABLE public.ecd_skills_ratings 
ADD CONSTRAINT ecd_skills_ratings_report_skill_unique UNIQUE (report_card_id, skill_id);

-- Add authorized_pickups column to students for ECD ID card back
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS authorized_pickups jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ecd_role_badge text DEFAULT NULL;

-- Update ecd_rating_scale to support 1-4 scoring
ALTER TABLE public.ecd_rating_scale 
ADD COLUMN IF NOT EXISTS numeric_value integer DEFAULT NULL;