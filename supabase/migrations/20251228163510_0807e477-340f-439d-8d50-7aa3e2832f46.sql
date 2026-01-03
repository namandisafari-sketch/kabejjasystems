-- Create sale_returns table to track returns, refunds, and exchanges
CREATE TABLE public.sale_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  return_type TEXT NOT NULL CHECK (return_type IN ('refund', 'void', 'exchange')),
  reason TEXT NOT NULL,
  total_refund_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  processed_by UUID REFERENCES auth.users(id),
  exchange_sale_id UUID REFERENCES public.sales(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_return_items to track which items were returned
CREATE TABLE public.sale_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  refund_amount NUMERIC NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add return_status column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL CHECK (return_status IS NULL OR return_status IN ('partial_return', 'full_return', 'voided', 'exchanged'));

-- Enable RLS
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sale_returns
CREATE POLICY "Users can view their tenant returns"
ON public.sale_returns FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert returns for their tenant"
ON public.sale_returns FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant returns"
ON public.sale_returns FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant returns"
ON public.sale_returns FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS policies for sale_return_items
CREATE POLICY "Users can view return items"
ON public.sale_return_items FOR SELECT
USING (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "Users can insert return items"
ON public.sale_return_items FOR INSERT
WITH CHECK (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "Users can update return items"
ON public.sale_return_items FOR UPDATE
USING (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "Users can delete return items"
ON public.sale_return_items FOR DELETE
USING (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));