-- Create school_settings table for school-specific configurations
CREATE TABLE public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  streams TEXT[] NOT NULL DEFAULT ARRAY['East', 'West', 'North', 'South', 'A', 'B', 'C', 'D'],
  class_naming_format TEXT DEFAULT 'senior', -- 'senior' for "Senior 1", 'form' for "Form 1", 's' for "S1"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their tenant school settings"
ON public.school_settings
FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert school settings for their tenant"
ON public.school_settings
FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant school settings"
ON public.school_settings
FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_school_settings_updated_at
BEFORE UPDATE ON public.school_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();