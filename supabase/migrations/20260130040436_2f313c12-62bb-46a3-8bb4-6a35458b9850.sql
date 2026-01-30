-- Create student_exam_scores table for storing individual student exam marks
CREATE TABLE IF NOT EXISTS public.student_exam_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  is_absent BOOLEAN DEFAULT false,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Enable RLS
ALTER TABLE public.student_exam_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view exam scores for their tenant" 
ON public.student_exam_scores 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert exam scores for their tenant" 
ON public.student_exam_scores 
FOR INSERT 
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update exam scores for their tenant" 
ON public.student_exam_scores 
FOR UPDATE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete exam scores for their tenant" 
ON public.student_exam_scores 
FOR DELETE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_student_exam_scores_updated_at
BEFORE UPDATE ON public.student_exam_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();