-- Enable realtime for gate_checkins table
ALTER TABLE gate_checkins REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_checkins;