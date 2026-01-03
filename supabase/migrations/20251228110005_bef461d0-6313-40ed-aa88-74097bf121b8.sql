-- Create table for ECD learning activities (Writing, Listening, Reading, Speaking, Drawing, Games, etc.)
CREATE TABLE public.ecd_learning_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecd_learning_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant activities" ON public.ecd_learning_activities
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their tenant activities" ON public.ecd_learning_activities
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create table for storing activity ratings per report card
CREATE TABLE public.ecd_activity_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID NOT NULL REFERENCES ecd_report_cards(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES ecd_learning_activities(id) ON DELETE CASCADE,
  rating_code TEXT NOT NULL, -- e.g. 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(report_card_id, activity_id)
);

-- Enable RLS
ALTER TABLE public.ecd_activity_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies  
CREATE POLICY "Users can view activity ratings" ON public.ecd_activity_ratings
  FOR SELECT USING (
    report_card_id IN (
      SELECT id FROM ecd_report_cards WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage activity ratings" ON public.ecd_activity_ratings
  FOR ALL USING (
    report_card_id IN (
      SELECT id FROM ecd_report_cards WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Add new columns to ecd_report_cards for the Ugandan format
ALTER TABLE public.ecd_report_cards 
  ADD COLUMN IF NOT EXISTS total_score NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_term_fees NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS term_closing_date DATE,
  ADD COLUMN IF NOT EXISTS next_term_start_date DATE;

-- Add numeric_score column to ecd_learning_ratings if it doesn't support 100-point scale
-- Update it to store scores out of 100 instead of 1-4
ALTER TABLE public.ecd_learning_ratings 
  ALTER COLUMN numeric_score TYPE NUMERIC(5,1);

-- Add remark field if not exists (for EXCELLENT, GOOD, etc.)
ALTER TABLE public.ecd_learning_ratings
  ADD COLUMN IF NOT EXISTS grade_remark TEXT;