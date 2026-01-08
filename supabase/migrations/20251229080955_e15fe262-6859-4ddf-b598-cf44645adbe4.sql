-- Allow public read access to repair_jobs for status lookup (only limited fields via application)
CREATE POLICY "Anyone can view job status by ref"
ON public.repair_jobs
FOR SELECT
USING (true);