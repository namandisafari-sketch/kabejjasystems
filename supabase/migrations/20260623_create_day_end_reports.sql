-- Day End Reports table for hardware shops
CREATE TABLE IF NOT EXISTS day_end_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  total_sales NUMERIC(15,2) DEFAULT 0,
  total_cash NUMERIC(15,2) DEFAULT 0,
  total_momo NUMERIC(15,2) DEFAULT 0,
  total_card NUMERIC(15,2) DEFAULT 0,
  total_credit NUMERIC(15,2) DEFAULT 0,
  total_gst_collected NUMERIC(15,2) DEFAULT 0,
  total_profit NUMERIC(15,2) DEFAULT 0,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  closing_balance NUMERIC(15,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, report_date)
);

-- Index for fast lookups by tenant + date
CREATE INDEX idx_day_end_reports_tenant_date ON day_end_reports(tenant_id, report_date);

-- Stock Takings table
CREATE TABLE IF NOT EXISTS stock_takings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stock_taking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_takings_tenant ON stock_takings(tenant_id, stock_taking_date);

CREATE TABLE IF NOT EXISTS stock_taking_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_taking_id UUID NOT NULL REFERENCES stock_takings(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  system_quantity NUMERIC(10,2) DEFAULT 0,
  counted_quantity NUMERIC(10,2) DEFAULT 0,
  variance NUMERIC(10,2) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  variance_percentage NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN system_quantity > 0 THEN ((counted_quantity - system_quantity) / system_quantity * 100) ELSE 0 END) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_taking_items_taking ON stock_taking_items(stock_taking_id);
CREATE INDEX idx_stock_taking_items_product ON stock_taking_items(product_id);

-- Supplier Aging Summary (computed on-demand, stored for historical snapshots)
CREATE TABLE IF NOT EXISTS supplier_aging_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_outstanding NUMERIC(15,2) DEFAULT 0,
  bucket_0_30 NUMERIC(15,2) DEFAULT 0,
  bucket_31_60 NUMERIC(15,2) DEFAULT 0,
  bucket_61_90 NUMERIC(15,2) DEFAULT 0,
  bucket_90_plus NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_aging_tenant ON supplier_aging_summary(tenant_id, snapshot_date);

-- Receivables Aging Summary
CREATE TABLE IF NOT EXISTS receivables_aging_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_outstanding NUMERIC(15,2) DEFAULT 0,
  bucket_0_30 NUMERIC(15,2) DEFAULT 0,
  bucket_31_60 NUMERIC(15,2) DEFAULT 0,
  bucket_61_90 NUMERIC(15,2) DEFAULT 0,
  bucket_90_plus NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receivables_aging_tenant ON receivables_aging_summary(tenant_id, snapshot_date);
