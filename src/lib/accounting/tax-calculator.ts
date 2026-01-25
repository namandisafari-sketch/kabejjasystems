import { supabase } from '@/integrations/supabase/client';
import { generateIncomeStatement } from './statements';

export interface VATReturn {
  periodStart: Date;
  periodEnd: Date;
  salesInclusiveOfVAT: number;
  salesExclusiveOfVAT: number;
  vatCollected: number;
  purchasesInclusiveOfVAT: number;
  purchasesExclusiveOfVAT: number;
  vatPaid: number;
  netVatPayable: number;
  dueDate: Date;
  status: 'pending' | 'filed' | 'paid';
}

export interface PAYETax {
  grossPay: number;
  taxableIncome: number;
  payeTax: number;
  effectiveRate: number;
}

export interface PayrollTaxSummary {
  periodStart: Date;
  periodEnd: Date;
  totalGrossPay: number;
  totalPayeTax: number;
  totalNssfEmployee: number;
  totalNssfEmployer: number;
  totalNetPay: number;
  employeeCount: number;
  dueDate: Date;
}

// Uganda VAT rate
const VAT_RATE = 0.18;

// Uganda PAYE tax brackets (2024)
const PAYE_BRACKETS = [
  { min: 0, max: 235000, rate: 0 },
  { min: 235001, max: 335000, rate: 0.10 },
  { min: 335001, max: 410000, rate: 0.20 },
  { min: 410001, max: 10000000, rate: 0.30 },
  { min: 10000001, max: Infinity, rate: 0.40 }
];

// NSSF rates
const NSSF_EMPLOYEE_RATE = 0.05;
const NSSF_EMPLOYER_RATE = 0.10;

export async function calculateVAT(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<VATReturn> {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  // Get sales for the period
  const { data: salesEntries } = await supabase
    .from('general_ledger')
    .select('credit_amount')
    .eq('tenant_id', tenantId)
    .eq('credit_account', 'SALES')
    .gte('date', start)
    .lte('date', end);

  const totalSales = salesEntries?.reduce((sum, e) => sum + Number(e.credit_amount), 0) || 0;
  
  // Calculate VAT (assuming sales are VAT inclusive)
  const salesExclusiveOfVAT = totalSales / (1 + VAT_RATE);
  const vatCollected = totalSales - salesExclusiveOfVAT;

  // Get purchases for the period (from inventory)
  const { data: purchaseEntries } = await supabase
    .from('general_ledger')
    .select('debit_amount')
    .eq('tenant_id', tenantId)
    .eq('debit_account', 'INVENTORY')
    .eq('transaction_type', 'purchase')
    .gte('date', start)
    .lte('date', end);

  const totalPurchases = purchaseEntries?.reduce((sum, e) => sum + Number(e.debit_amount), 0) || 0;
  const purchasesExclusiveOfVAT = totalPurchases / (1 + VAT_RATE);
  const vatPaid = totalPurchases - purchasesExclusiveOfVAT;

  const netVatPayable = vatCollected - vatPaid;

  // Due date is 15th of the following month
  const dueDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 15);

  const vatReturn: VATReturn = {
    periodStart: startDate,
    periodEnd: endDate,
    salesInclusiveOfVAT: totalSales,
    salesExclusiveOfVAT,
    vatCollected,
    purchasesInclusiveOfVAT: totalPurchases,
    purchasesExclusiveOfVAT,
    vatPaid,
    netVatPayable,
    dueDate,
    status: 'pending'
  };

  // Record the VAT liability
  if (netVatPayable > 0) {
    await supabase.from('tax_tracking').insert({
      tenant_id: tenantId,
      tax_type: 'VAT',
      tax_rate: VAT_RATE * 100,
      tax_amount: netVatPayable,
      tax_base: salesExclusiveOfVAT,
      period_start: start,
      period_end: end,
      status: 'pending'
    });
  }

  return vatReturn;
}

export function calculatePAYE(monthlyGrossPay: number): PAYETax {
  let remainingIncome = monthlyGrossPay;
  let totalTax = 0;

  for (const bracket of PAYE_BRACKETS) {
    if (remainingIncome <= 0) break;

    const bracketWidth = bracket.max - bracket.min + 1;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    totalTax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return {
    grossPay: monthlyGrossPay,
    taxableIncome: monthlyGrossPay,
    payeTax: Math.round(totalTax),
    effectiveRate: monthlyGrossPay > 0 ? (totalTax / monthlyGrossPay) * 100 : 0
  };
}

export function calculateNSSF(grossPay: number) {
  return {
    employeeContribution: Math.round(grossPay * NSSF_EMPLOYEE_RATE),
    employerContribution: Math.round(grossPay * NSSF_EMPLOYER_RATE),
    totalContribution: Math.round(grossPay * (NSSF_EMPLOYEE_RATE + NSSF_EMPLOYER_RATE))
  };
}

export async function calculatePayrollTaxes(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<PayrollTaxSummary> {
  const start = periodStart.toISOString().split('T')[0];
  const end = periodEnd.toISOString().split('T')[0];

  const { data: payrollRecords } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('pay_period_start', start)
    .lte('pay_period_end', end);

  const totalGrossPay = payrollRecords?.reduce((sum, p) => sum + Number(p.gross_pay), 0) || 0;
  const totalPayeTax = payrollRecords?.reduce((sum, p) => sum + Number(p.paye_tax), 0) || 0;
  const totalNssfEmployee = payrollRecords?.reduce((sum, p) => sum + Number(p.nssf_employee), 0) || 0;
  const totalNssfEmployer = payrollRecords?.reduce((sum, p) => sum + Number(p.nssf_employer), 0) || 0;
  const totalNetPay = payrollRecords?.reduce((sum, p) => sum + Number(p.net_pay), 0) || 0;

  // PAYE and NSSF due by 15th of following month
  const dueDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 15);

  return {
    periodStart,
    periodEnd,
    totalGrossPay,
    totalPayeTax,
    totalNssfEmployee,
    totalNssfEmployer,
    totalNetPay,
    employeeCount: payrollRecords?.length || 0,
    dueDate
  };
}

export async function generateAnnualTaxReturn(
  tenantId: string,
  taxYear: number
) {
  const startDate = new Date(taxYear, 0, 1);
  const endDate = new Date(taxYear, 11, 31);

  // Generate annual income statement
  const statement = await generateIncomeStatement(tenantId, startDate, endDate);

  // Get deduction details
  const { data: deductions } = await supabase
    .from('general_ledger')
    .select('debit_amount, debit_account')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .in('debit_account', ['SALARY', 'RENT', 'UTILITIES', 'DEPRECIATION', 'INSURANCE', 'PROFESSIONAL']);

  const deductionsByCategory: Record<string, number> = {};
  for (const d of deductions || []) {
    deductionsByCategory[d.debit_account] = (deductionsByCategory[d.debit_account] || 0) + Number(d.debit_amount);
  }

  const taxableIncome = statement.netProfit;
  const corporateTaxRate = 0.30; // Uganda corporate tax rate
  const incomeTaxOwed = Math.max(0, taxableIncome * corporateTaxRate);

  const taxReturn = {
    taxYear,
    tenantId,
    incomeStatement: statement,
    deductions: {
      salaries: deductionsByCategory['SALARY'] || 0,
      rent: deductionsByCategory['RENT'] || 0,
      utilities: deductionsByCategory['UTILITIES'] || 0,
      depreciation: deductionsByCategory['DEPRECIATION'] || 0,
      insurance: deductionsByCategory['INSURANCE'] || 0,
      professional: deductionsByCategory['PROFESSIONAL'] || 0,
      total: Object.values(deductionsByCategory).reduce((a, b) => a + b, 0)
    },
    taxableIncome,
    incomeTaxRate: corporateTaxRate * 100,
    incomeTaxOwed,
    estimatedQuarterlyPayments: {
      q1: incomeTaxOwed / 4,
      q2: incomeTaxOwed / 4,
      q3: incomeTaxOwed / 4,
      q4: incomeTaxOwed / 4
    },
    status: 'ready_to_file',
    generatedAt: new Date().toISOString()
  };

  // Cache the tax return
  await supabase.from('financial_statements_cache').insert({
    tenant_id: tenantId,
    statement_type: 'INCOME_TAX_RETURN',
    period_start: startDate.toISOString().split('T')[0],
    period_end: endDate.toISOString().split('T')[0],
    statement_json: taxReturn,
    generated_at: new Date().toISOString()
  });

  return taxReturn;
}

export async function getTaxSummary(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Get pending taxes
  const { data: pendingTaxes } = await supabase
    .from('tax_tracking')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending');

  const vatDue = pendingTaxes?.filter(t => t.tax_type === 'VAT').reduce((sum, t) => sum + Number(t.tax_amount), 0) || 0;
  const payeDue = pendingTaxes?.filter(t => t.tax_type === 'PAYE').reduce((sum, t) => sum + Number(t.tax_amount), 0) || 0;
  const nssfDue = pendingTaxes?.filter(t => t.tax_type === 'NSSF').reduce((sum, t) => sum + Number(t.tax_amount), 0) || 0;

  return {
    vatDue,
    payeDue,
    nssfDue,
    totalDue: vatDue + payeDue + nssfDue,
    nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15)
  };
}
