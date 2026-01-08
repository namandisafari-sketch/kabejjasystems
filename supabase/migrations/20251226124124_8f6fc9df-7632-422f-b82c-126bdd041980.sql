-- RLS policies for parents to view their children's student_fees
CREATE POLICY "Parents can view their children's student fees"
ON public.student_fees
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS policies for parents to view their children's fee_payments
CREATE POLICY "Parents can view their children's fee payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS policies for parents to view their children's report cards
CREATE POLICY "Parents can view their children's report cards"
ON public.student_report_cards
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
  AND status = 'published'
);