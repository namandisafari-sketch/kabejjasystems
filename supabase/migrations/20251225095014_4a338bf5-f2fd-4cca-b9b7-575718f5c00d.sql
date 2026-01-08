-- Split payments table to track multiple payment methods per sale
CREATE TABLE public.sale_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert sale payments for their tenant sales"
ON public.sale_payments FOR INSERT
WITH CHECK (sale_id IN (
  SELECT id FROM sales WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

CREATE POLICY "Users can view sale payments for their tenant sales"
ON public.sale_payments FOR SELECT
USING (sale_id IN (
  SELECT id FROM sales WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

-- Layaway/Installment plans table
CREATE TABLE public.layaway_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  installment_count INTEGER NOT NULL DEFAULT 1,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.layaway_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage layaway plans for their tenant"
ON public.layaway_plans FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Installment payments for layaway
CREATE TABLE public.installment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layaway_id UUID NOT NULL REFERENCES public.layaway_plans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  received_by UUID,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage installment payments"
ON public.installment_payments FOR ALL
USING (layaway_id IN (
  SELECT id FROM layaway_plans WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

-- Layaway items table
CREATE TABLE public.layaway_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layaway_id UUID NOT NULL REFERENCES public.layaway_plans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.layaway_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage layaway items"
ON public.layaway_items FOR ALL
USING (layaway_id IN (
  SELECT id FROM layaway_plans WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

-- Customer favorites table
CREATE TABLE public.customer_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  times_purchased INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage customer favorites for their tenant"
ON public.customer_favorites FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- POS queue for bulk sales
CREATE TABLE public.pos_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  queue_number INTEGER NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pos_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage POS queue for their tenant"
ON public.pos_queue FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Enable realtime for POS queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_queue;
ALTER TABLE public.pos_queue REPLICA IDENTITY FULL;

-- Enable realtime for sales (for dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Create trigger for layaway updated_at
CREATE TRIGGER update_layaway_plans_updated_at
BEFORE UPDATE ON public.layaway_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for customer favorites updated_at
CREATE TRIGGER update_customer_favorites_updated_at
BEFORE UPDATE ON public.customer_favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();