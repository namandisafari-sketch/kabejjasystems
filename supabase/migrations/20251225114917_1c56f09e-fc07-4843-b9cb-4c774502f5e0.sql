-- Create internal stock usage table
CREATE TABLE public.internal_stock_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  usage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_stock_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant usage records"
  ON public.internal_stock_usage
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert usage records for their tenant"
  ON public.internal_stock_usage
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant usage records"
  ON public.internal_stock_usage
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant usage records"
  ON public.internal_stock_usage
  FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_internal_stock_usage_tenant ON public.internal_stock_usage(tenant_id);
CREATE INDEX idx_internal_stock_usage_product ON public.internal_stock_usage(product_id);
CREATE INDEX idx_internal_stock_usage_date ON public.internal_stock_usage(usage_date);