
-- Allow parents to view their linked students
CREATE POLICY "Parents can view their linked students"
ON public.students
FOR SELECT
USING (
  id IN (
    SELECT ps.student_id 
    FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
