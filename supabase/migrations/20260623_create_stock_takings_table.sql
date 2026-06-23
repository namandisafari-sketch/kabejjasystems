-- Create stock_takings table for stock-taking records
CREATE TABLE IF NOT EXISTS public.stock_takings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    stock_taking_date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    status text DEFAULT 'completed' NOT NULL, -- 'draft', 'in_progress', 'completed'
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_takings_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Create stock_taking_items table for individual product counts
CREATE TABLE IF NOT EXISTS public.stock_taking_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    stock_taking_id uuid NOT NULL REFERENCES public.stock_takings(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    system_quantity integer DEFAULT 0 NOT NULL,
    counted_quantity integer NOT NULL,
    variance integer GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_percentage numeric(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN system_quantity = 0 THEN 0
            ELSE ROUND(((counted_quantity - system_quantity)::numeric / system_quantity::numeric) * 100, 2)
        END
    ) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_taking_items_unique UNIQUE(stock_taking_id, product_id),
    CONSTRAINT stock_taking_items_stock_taking_id_fk FOREIGN KEY (stock_taking_id) REFERENCES public.stock_takings(id) ON DELETE CASCADE,
    CONSTRAINT stock_taking_items_product_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_takings_tenant_id ON public.stock_takings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_takings_date ON public.stock_takings(stock_taking_date);
CREATE INDEX IF NOT EXISTS idx_stock_taking_items_stock_taking_id ON public.stock_taking_items(stock_taking_id);
CREATE INDEX IF NOT EXISTS idx_stock_taking_items_product_id ON public.stock_taking_items(product_id);

-- Enable RLS
ALTER TABLE public.stock_takings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_taking_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "stock_takings_select_policy" ON public.stock_takings FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "stock_takings_insert_policy" ON public.stock_takings FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "stock_takings_update_policy" ON public.stock_takings FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "stock_takings_delete_policy" ON public.stock_takings FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "stock_taking_items_select_policy" ON public.stock_taking_items FOR SELECT
    USING (stock_taking_id IN (SELECT id FROM public.stock_takings WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "stock_taking_items_insert_policy" ON public.stock_taking_items FOR INSERT
    WITH CHECK (stock_taking_id IN (SELECT id FROM public.stock_takings WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "stock_taking_items_update_policy" ON public.stock_taking_items FOR UPDATE
    USING (stock_taking_id IN (SELECT id FROM public.stock_takings WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (stock_taking_id IN (SELECT id FROM public.stock_takings WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "stock_taking_items_delete_policy" ON public.stock_taking_items FOR DELETE
    USING (stock_taking_id IN (SELECT id FROM public.stock_takings WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));
