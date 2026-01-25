import { supabase } from '@/integrations/supabase/client';
import { updateAccountBalance } from './chart-of-accounts';

export type TransactionType = 'sale' | 'purchase' | 'expense' | 'payroll' | 'transfer' | 'adjustment';

export interface LedgerEntry {
  account: string;
  debit?: number;
  credit?: number;
}

export interface TransactionEntry {
  tenantId: string;
  date: Date;
  type: TransactionType;
  referenceId: string;
  referenceNumber: string;
  entries: LedgerEntry[];
  description: string;
  createdBy?: string;
}

export async function recordTransaction(transaction: TransactionEntry) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create ledger entries for each account entry
  const glEntries = [];
  
  for (const entry of transaction.entries) {
    if (entry.debit && entry.debit > 0) {
      glEntries.push({
        tenant_id: transaction.tenantId,
        date: transaction.date.toISOString().split('T')[0],
        transaction_type: transaction.type,
        reference_id: transaction.referenceId,
        reference_number: transaction.referenceNumber,
        debit_account: entry.account,
        debit_amount: entry.debit,
        credit_account: null,
        credit_amount: 0,
        description: transaction.description,
        created_by: user?.id || transaction.createdBy,
        approval_status: 'approved'
      });
    }
    
    if (entry.credit && entry.credit > 0) {
      glEntries.push({
        tenant_id: transaction.tenantId,
        date: transaction.date.toISOString().split('T')[0],
        transaction_type: transaction.type,
        reference_id: transaction.referenceId,
        reference_number: transaction.referenceNumber,
        debit_account: null,
        debit_amount: 0,
        credit_account: entry.account,
        credit_amount: entry.credit,
        description: transaction.description,
        created_by: user?.id || transaction.createdBy,
        approval_status: 'approved'
      });
    }
  }

  const { data, error } = await supabase
    .from('general_ledger')
    .insert(glEntries)
    .select();

  if (error) throw error;

  // Update account balances
  for (const entry of transaction.entries) {
    if (entry.debit && entry.debit > 0) {
      await updateAccountBalance(transaction.tenantId, entry.account, entry.debit, true);
    }
    if (entry.credit && entry.credit > 0) {
      await updateAccountBalance(transaction.tenantId, entry.account, entry.credit, false);
    }
  }

  // Create audit trail
  if (data && data.length > 0) {
    await supabase.from('transaction_audit_trail').insert({
      tenant_id: transaction.tenantId,
      general_ledger_id: data[0].id,
      action: 'created',
      user_id: user?.id,
      new_values: { entries: glEntries, description: transaction.description }
    });
  }

  return data;
}

// Auto-record when a sale is made
export async function recordSaleTransaction(sale: {
  id: string;
  tenant_id: string;
  created_at: string;
  total_amount: number;
  payment_method?: string;
  invoice_number?: string;
  cost_of_goods?: number;
}) {
  const paymentAccount = sale.payment_method === 'mobile_money' || sale.payment_method === 'bank' 
    ? 'BANK' 
    : 'CASH';

  const entries: LedgerEntry[] = [
    { account: paymentAccount, debit: sale.total_amount },
    { account: 'SALES', credit: sale.total_amount }
  ];

  // If we have cost of goods info, also record COGS
  if (sale.cost_of_goods && sale.cost_of_goods > 0) {
    entries.push(
      { account: 'COGS', debit: sale.cost_of_goods },
      { account: 'INVENTORY', credit: sale.cost_of_goods }
    );
  }

  return recordTransaction({
    tenantId: sale.tenant_id,
    date: new Date(sale.created_at),
    type: 'sale',
    referenceId: sale.id,
    referenceNumber: sale.invoice_number || `SALE-${sale.id.substring(0, 8)}`,
    entries,
    description: `Sale recorded: ${sale.invoice_number || sale.id}`
  });
}

// Auto-record when a purchase/stock is added
export async function recordPurchaseTransaction(purchase: {
  id: string;
  tenant_id: string;
  created_at: string;
  total_amount: number;
  payment_method?: string;
  reference_number?: string;
}) {
  const paymentAccount = purchase.payment_method === 'credit' ? 'AP' : 'CASH';

  return recordTransaction({
    tenantId: purchase.tenant_id,
    date: new Date(purchase.created_at),
    type: 'purchase',
    referenceId: purchase.id,
    referenceNumber: purchase.reference_number || `PUR-${purchase.id.substring(0, 8)}`,
    entries: [
      { account: 'INVENTORY', debit: purchase.total_amount },
      { account: paymentAccount, credit: purchase.total_amount }
    ],
    description: `Purchase: ${purchase.reference_number || purchase.id}`
  });
}

// Auto-record expenses
export async function recordExpenseTransaction(expense: {
  id: string;
  tenant_id: string;
  expense_date: string;
  amount: number;
  category: string;
  payment_method?: string;
  description?: string;
}) {
  // Map expense category to account code
  const categoryToAccount: Record<string, string> = {
    'Salary': 'SALARY',
    'Rent': 'RENT',
    'Utilities': 'UTILITIES',
    'Marketing': 'MARKETING',
    'Transport': 'TRANSPORT',
    'Supplies': 'OFFICE_SUPPLIES',
    'Repairs': 'REPAIRS',
    'Insurance': 'INSURANCE',
    'Professional': 'PROFESSIONAL',
    'Bank Charges': 'BANK_CHARGES',
    'Other': 'MISC_EXPENSE'
  };

  const expenseAccount = categoryToAccount[expense.category] || 'MISC_EXPENSE';
  const paymentAccount = expense.payment_method === 'bank' || expense.payment_method === 'mobile_money' 
    ? 'BANK' 
    : 'CASH';

  return recordTransaction({
    tenantId: expense.tenant_id,
    date: new Date(expense.expense_date),
    type: 'expense',
    referenceId: expense.id,
    referenceNumber: `EXP-${expense.id.substring(0, 8)}`,
    entries: [
      { account: expenseAccount, debit: expense.amount },
      { account: paymentAccount, credit: expense.amount }
    ],
    description: expense.description || `${expense.category} expense`
  });
}

// Record payroll transaction
export async function recordPayrollTransaction(payroll: {
  id: string;
  tenant_id: string;
  pay_period_end: string;
  gross_pay: number;
  net_pay: number;
  paye_tax: number;
  nssf_employee: number;
  nssf_employer: number;
  employee_name?: string;
}) {
  return recordTransaction({
    tenantId: payroll.tenant_id,
    date: new Date(payroll.pay_period_end),
    type: 'payroll',
    referenceId: payroll.id,
    referenceNumber: `PAY-${payroll.id.substring(0, 8)}`,
    entries: [
      { account: 'SALARY', debit: payroll.gross_pay + payroll.nssf_employer },
      { account: 'CASH', credit: payroll.net_pay },
      { account: 'PAYE_PAYABLE', credit: payroll.paye_tax },
      { account: 'NSSF_PAYABLE', credit: payroll.nssf_employee + payroll.nssf_employer }
    ],
    description: `Payroll for ${payroll.employee_name || 'employee'}`
  });
}

// Get ledger entries for a period
export async function getLedgerEntries(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  transactionType?: TransactionType
) {
  let query = supabase
    .from('general_ledger')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
