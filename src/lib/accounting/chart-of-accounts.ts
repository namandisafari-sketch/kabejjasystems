import { supabase } from '@/integrations/supabase/client';

export interface ChartAccount {
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  sub_type: string;
  description?: string;
}

export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccount[] = [
  // ASSETS
  { account_code: 'CASH', account_name: 'Cash on Hand', account_type: 'ASSET', sub_type: 'CURRENT_ASSET', description: 'Physical cash held by the business' },
  { account_code: 'BANK', account_name: 'Bank Accounts', account_type: 'ASSET', sub_type: 'CURRENT_ASSET', description: 'Money deposited in bank accounts' },
  { account_code: 'AR', account_name: 'Accounts Receivable', account_type: 'ASSET', sub_type: 'CURRENT_ASSET', description: 'Money owed by customers' },
  { account_code: 'INVENTORY', account_name: 'Inventory', account_type: 'ASSET', sub_type: 'CURRENT_ASSET', description: 'Stock of goods for sale' },
  { account_code: 'PREPAID', account_name: 'Prepaid Expenses', account_type: 'ASSET', sub_type: 'CURRENT_ASSET', description: 'Expenses paid in advance' },
  { account_code: 'EQUIPMENT', account_name: 'Equipment', account_type: 'ASSET', sub_type: 'FIXED_ASSET', description: 'Business equipment and machinery' },
  { account_code: 'FURNITURE', account_name: 'Furniture & Fixtures', account_type: 'ASSET', sub_type: 'FIXED_ASSET', description: 'Office furniture and fixtures' },
  { account_code: 'VEHICLES', account_name: 'Vehicles', account_type: 'ASSET', sub_type: 'FIXED_ASSET', description: 'Company vehicles' },
  { account_code: 'ACCUM_DEPR', account_name: 'Accumulated Depreciation', account_type: 'ASSET', sub_type: 'FIXED_ASSET', description: 'Total depreciation of fixed assets' },

  // LIABILITIES
  { account_code: 'AP', account_name: 'Accounts Payable', account_type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', description: 'Money owed to suppliers' },
  { account_code: 'VAT_PAYABLE', account_name: 'VAT Payable', account_type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', description: 'VAT collected to be remitted' },
  { account_code: 'PAYE_PAYABLE', account_name: 'PAYE Tax Payable', account_type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', description: 'Employee income tax withheld' },
  { account_code: 'NSSF_PAYABLE', account_name: 'NSSF Payable', account_type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', description: 'Social security contributions payable' },
  { account_code: 'WAGES_PAYABLE', account_name: 'Wages Payable', account_type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', description: 'Accrued but unpaid wages' },
  { account_code: 'LOAN', account_name: 'Loans Payable', account_type: 'LIABILITY', sub_type: 'LONG_TERM_LIABILITY', description: 'Long-term debt obligations' },

  // EQUITY
  { account_code: 'CAPITAL', account_name: "Owner's Capital", account_type: 'EQUITY', sub_type: 'OWNER_EQUITY', description: 'Initial investment by owner' },
  { account_code: 'DRAWINGS', account_name: "Owner's Drawings", account_type: 'EQUITY', sub_type: 'OWNER_EQUITY', description: 'Withdrawals by owner' },
  { account_code: 'RETAINED_EARNINGS', account_name: 'Retained Earnings', account_type: 'EQUITY', sub_type: 'OWNER_EQUITY', description: 'Accumulated profits not distributed' },

  // INCOME
  { account_code: 'SALES', account_name: 'Sales Revenue', account_type: 'INCOME', sub_type: 'OPERATING_REVENUE', description: 'Revenue from product sales' },
  { account_code: 'SERVICE_INCOME', account_name: 'Service Income', account_type: 'INCOME', sub_type: 'OPERATING_REVENUE', description: 'Revenue from services' },
  { account_code: 'DISCOUNTS', account_name: 'Sales Discounts', account_type: 'INCOME', sub_type: 'OPERATING_REVENUE', description: 'Discounts given to customers' },
  { account_code: 'RETURNS', account_name: 'Sales Returns', account_type: 'INCOME', sub_type: 'OPERATING_REVENUE', description: 'Goods returned by customers' },
  { account_code: 'OTHER_INCOME', account_name: 'Other Income', account_type: 'INCOME', sub_type: 'NON_OPERATING_REVENUE', description: 'Miscellaneous income' },
  { account_code: 'INTEREST_INCOME', account_name: 'Interest Income', account_type: 'INCOME', sub_type: 'NON_OPERATING_REVENUE', description: 'Interest earned on deposits' },

  // EXPENSES
  { account_code: 'COGS', account_name: 'Cost of Goods Sold', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Direct cost of products sold' },
  { account_code: 'SALARY', account_name: 'Salaries & Wages', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Employee compensation' },
  { account_code: 'RENT', account_name: 'Rent Expense', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Rental payments for premises' },
  { account_code: 'UTILITIES', account_name: 'Utilities', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Electricity, water, internet' },
  { account_code: 'MARKETING', account_name: 'Marketing & Advertising', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Promotional costs' },
  { account_code: 'DEPRECIATION', account_name: 'Depreciation Expense', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Periodic asset depreciation' },
  { account_code: 'INSURANCE', account_name: 'Insurance', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Business insurance premiums' },
  { account_code: 'OFFICE_SUPPLIES', account_name: 'Office Supplies', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Stationery and office materials' },
  { account_code: 'TRANSPORT', account_name: 'Transportation', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Delivery and transport costs' },
  { account_code: 'PROFESSIONAL', account_name: 'Professional Fees', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Legal, accounting, consulting fees' },
  { account_code: 'REPAIRS', account_name: 'Repairs & Maintenance', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Equipment and facility repairs' },
  { account_code: 'BANK_CHARGES', account_name: 'Bank Charges', account_type: 'EXPENSE', sub_type: 'NON_OPERATING_EXPENSE', description: 'Bank fees and charges' },
  { account_code: 'INTEREST_EXPENSE', account_name: 'Interest Expense', account_type: 'EXPENSE', sub_type: 'NON_OPERATING_EXPENSE', description: 'Interest paid on loans' },
  { account_code: 'MISC_EXPENSE', account_name: 'Miscellaneous Expenses', account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', description: 'Other business expenses' },
];

export async function initializeChartOfAccounts(tenantId: string) {
  // Check if already initialized
  const { data: existing } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, message: 'Chart of accounts already initialized' };
  }

  const accounts = DEFAULT_CHART_OF_ACCOUNTS.map(acc => ({
    ...acc,
    tenant_id: tenantId,
    balance: 0,
    is_active: true
  }));

  const { error } = await supabase
    .from('chart_of_accounts')
    .insert(accounts);

  if (error) throw error;

  return { success: true, message: 'Chart of accounts initialized successfully' };
}

export async function getChartOfAccounts(tenantId: string) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('account_type')
    .order('account_code');

  if (error) throw error;
  return data || [];
}

export async function createCustomAccount(
  tenantId: string,
  account: Omit<ChartAccount, 'account_code'> & { account_code: string }
) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert({
      ...account,
      tenant_id: tenantId,
      balance: 0,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccountBalance(
  tenantId: string,
  accountCode: string,
  amount: number,
  isDebit: boolean
) {
  const { data: account } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('account_code', accountCode)
    .single();

  if (!account) throw new Error(`Account ${accountCode} not found`);

  // Determine if this increases or decreases the balance
  // Assets & Expenses: Debit increases, Credit decreases
  // Liabilities, Equity, Income: Credit increases, Debit decreases
  const isNormalDebit = ['ASSET', 'EXPENSE'].includes(account.account_type);
  const multiplier = isNormalDebit === isDebit ? 1 : -1;
  const newBalance = Number(account.balance) + (amount * multiplier);

  const { error } = await supabase
    .from('chart_of_accounts')
    .update({ balance: newBalance })
    .eq('id', account.id);

  if (error) throw error;
  return newBalance;
}
