-- Add A-Level specific columns to report_card_scores
ALTER TABLE report_card_scores 
ADD COLUMN IF NOT EXISTS formative_a1 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS formative_a2 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS formative_a3 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS formative_avg numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS eot_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS summative_grade text,
ADD COLUMN IF NOT EXISTS teacher_initials text;

-- Add A-Level specific columns to student_report_cards
ALTER TABLE student_report_cards 
ADD COLUMN IF NOT EXISTS student_combination text,
ADD COLUMN IF NOT EXISTS stream text,
ADD COLUMN IF NOT EXISTS roll_number text,
ADD COLUMN IF NOT EXISTS overall_identifier text,
ADD COLUMN IF NOT EXISTS overall_achievement text,
ADD COLUMN IF NOT EXISTS overall_grade text,
ADD COLUMN IF NOT EXISTS term_end_date date,
ADD COLUMN IF NOT EXISTS next_term_start_date date,
ADD COLUMN IF NOT EXISTS fees_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_term_fees numeric DEFAULT 0;

-- Add project work columns to report_card_activities  
ALTER TABLE report_card_activities
ADD COLUMN IF NOT EXISTS average_score numeric,
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS teacher_initials text;