-- Uganda 18% GST/VAT Compliance Migration
-- Adds GST fields to sales and sale_items tables

-- Add GST-related columns to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS gst_amount numeric(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS gst_rate numeric(5,2) DEFAULT 18.00 NOT NULL,
ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) DEFAULT 0 NOT NULL;

-- Add GST exemption flag to sale_items table
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS is_gst_exempt boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS gst_amount numeric(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS price_before_gst numeric(10,2) NOT NULL DEFAULT 0;

-- Add GST-related columns to products table for product-level exemption
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_gst_exempt boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS gst_rate numeric(5,2) DEFAULT 18.00 NOT NULL;

-- Create GST_SETTINGS table to store GST configuration per tenant
CREATE TABLE IF NOT EXISTS public.gst_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    standard_rate numeric(5,2) DEFAULT 18.00 NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    currency text DEFAULT 'UGX' NOT NULL,
    registration_number text,
    tax_period_start_date date,
    tax_period_end_date date,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create GST_COMPLIANCE_REPORT table to track monthly/periodic compliance
CREATE TABLE IF NOT EXISTS public.gst_compliance_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    report_period_start date NOT NULL,
    report_period_end date NOT NULL,
    taxable_sales numeric(15,2) DEFAULT 0 NOT NULL,
    exempt_sales numeric(15,2) DEFAULT 0 NOT NULL,
    total_gst_collected numeric(15,2) DEFAULT 0 NOT NULL,
    total_sales numeric(15,2) DEFAULT 0 NOT NULL,
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    generated_by uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_report_period UNIQUE(tenant_id, report_period_start, report_period_end)
);

-- Enable RLS on new tables
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_compliance_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for gst_settings
CREATE POLICY "Tenants can view their own GST settings" ON public.gst_settings
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Tenants can update their own GST settings" ON public.gst_settings
    FOR UPDATE USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Tenants can insert their own GST settings" ON public.gst_settings
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Create RLS policies for gst_compliance_reports
CREATE POLICY "Tenants can view their own GST compliance reports" ON public.gst_compliance_reports
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Tenants can insert their own GST compliance reports" ON public.gst_compliance_reports
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Tenants can update their own GST compliance reports" ON public.gst_compliance_reports
    FOR UPDATE USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_gst_amount ON public.sales(tenant_id, sale_date) WHERE gst_amount > 0;
CREATE INDEX IF NOT EXISTS idx_gst_settings_tenant ON public.gst_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gst_compliance_reports_period ON public.gst_compliance_reports(tenant_id, report_period_start, report_period_end);

-- Add comments for documentation
COMMENT ON TABLE public.gst_settings IS 'Uganda GST/VAT settings and configuration per tenant';
COMMENT ON TABLE public.gst_compliance_reports IS 'Monthly/periodic GST compliance reports for Uganda tax compliance';
COMMENT ON COLUMN public.sales.gst_amount IS 'Total GST amount collected for this sale (18% standard)';
COMMENT ON COLUMN public.sales.gst_rate IS 'GST rate applied to this sale (e.g., 18 for 18%)';
COMMENT ON COLUMN public.sales.subtotal IS 'Subtotal before GST for clear tax breakdown';
COMMENT ON COLUMN public.products.is_gst_exempt IS 'Flag indicating if this product is GST exempt';
COMMENT ON COLUMN public.products.gst_rate IS 'GST rate for this specific product (0 for exempt, 18 for standard)';
