// Stock-taking types and interfaces
export interface StockTaking {
  id: string;
  tenant_id: string;
  stock_taking_date: string;
  notes?: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_by?: string;
  created_at: string;
  updated_at: string;
  stock_taking_items?: StockTakingItem[];
}

export interface StockTakingItem {
  id: string;
  stock_taking_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    unit_price: number;
    cost_price?: number;
    category?: string;
  };
}

export interface StockVarianceReport {
  total_items: number;
  items_with_variance: number;
  total_variance_value: number;
  high_variance_count: number;
  low_variance_count: number;
  items: StockTakingItem[];
  generated_at: string;
  stock_taking_date: string;
}

export interface ProductForStockTaking {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  unit_price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock_level?: number;
  is_active: boolean;
}
