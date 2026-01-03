-- Add frequency column to term_requirements
ALTER TABLE public.term_requirements 
ADD COLUMN frequency text NOT NULL DEFAULT 'term' 
CHECK (frequency IN ('term', 'year', 'one_time'));