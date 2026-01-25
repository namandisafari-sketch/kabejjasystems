import { supabase } from '@/integrations/supabase/client';
import { calculatePAYE, calculateNSSF } from './tax-calculator';
import { recordPayrollTransaction } from './transaction-recorder';

export interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  grossPay: number;
  allowances: number;
  payeTax: number;
  nssfEmployee: number;
  nssfEmployer: number;
  otherDeductions: number;
  netPay: number;
  totalEmployerCost: number;
}

export interface PayrollBatch {
  id?: string;
  tenantId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  calculations: PayrollCalculation[];
  totalGrossPay: number;
  totalPayeTax: number;
  totalNssfEmployee: number;
  totalNssfEmployer: number;
  totalNetPay: number;
  totalEmployerCost: number;
  status: 'draft' | 'approved' | 'paid';
}

export async function calculateEmployeePayroll(
  employee: {
    id: string;
    full_name: string;
    salary: number;
  },
  allowances: number = 0,
  otherDeductions: number = 0
): Promise<PayrollCalculation> {
  const grossPay = Number(employee.salary) + allowances;
  
  // Calculate PAYE
  const paye = calculatePAYE(grossPay);
  
  // Calculate NSSF
  const nssf = calculateNSSF(grossPay);
  
  const netPay = grossPay - paye.payeTax - nssf.employeeContribution - otherDeductions;
  const totalEmployerCost = grossPay + nssf.employerContribution;

  return {
    employeeId: employee.id,
    employeeName: employee.full_name,
    grossPay,
    allowances,
    payeTax: paye.payeTax,
    nssfEmployee: nssf.employeeContribution,
    nssfEmployer: nssf.employerContribution,
    otherDeductions,
    netPay,
    totalEmployerCost
  };
}

export async function generatePayrollBatch(
  tenantId: string,
  payPeriodStart: Date,
  payPeriodEnd: Date
): Promise<PayrollBatch> {
  // Get all active employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, salary')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const calculations: PayrollCalculation[] = [];
  
  for (const employee of employees || []) {
    if (employee.salary && employee.salary > 0) {
      const calc = await calculateEmployeePayroll(employee);
      calculations.push(calc);
    }
  }

  const batch: PayrollBatch = {
    tenantId,
    payPeriodStart,
    payPeriodEnd,
    calculations,
    totalGrossPay: calculations.reduce((sum, c) => sum + c.grossPay, 0),
    totalPayeTax: calculations.reduce((sum, c) => sum + c.payeTax, 0),
    totalNssfEmployee: calculations.reduce((sum, c) => sum + c.nssfEmployee, 0),
    totalNssfEmployer: calculations.reduce((sum, c) => sum + c.nssfEmployer, 0),
    totalNetPay: calculations.reduce((sum, c) => sum + c.netPay, 0),
    totalEmployerCost: calculations.reduce((sum, c) => sum + c.totalEmployerCost, 0),
    status: 'draft'
  };

  return batch;
}

export async function savePayrollBatch(batch: PayrollBatch) {
  const records = batch.calculations.map(calc => ({
    tenant_id: batch.tenantId,
    employee_id: calc.employeeId,
    pay_period_start: batch.payPeriodStart.toISOString().split('T')[0],
    pay_period_end: batch.payPeriodEnd.toISOString().split('T')[0],
    base_salary: calc.grossPay,
    gross_pay: calc.grossPay,
    paye_tax: calc.payeTax,
    nssf_employee: calc.nssfEmployee,
    nssf_employer: calc.nssfEmployer,
    deductions: calc.otherDeductions,
    other_deductions: calc.otherDeductions,
    net_salary: calc.netPay,
    net_pay: calc.netPay,
    total_employer_cost: calc.totalEmployerCost,
    status: batch.status
  }));

  const { data, error } = await (supabase
    .from('payroll_records')
    .insert(records as any)
    .select() as any);

  if (error) throw error;

  return data;
}

export async function processPayroll(batch: PayrollBatch) {
  // Save payroll records
  const records = await savePayrollBatch(batch);

  // Record accounting entries for each employee
  for (let i = 0; i < batch.calculations.length; i++) {
    const calc = batch.calculations[i];
    const record = records[i];

    await recordPayrollTransaction({
      id: record.id,
      tenant_id: batch.tenantId,
      pay_period_end: batch.payPeriodEnd.toISOString(),
      gross_pay: calc.grossPay,
      net_pay: calc.netPay,
      paye_tax: calc.payeTax,
      nssf_employee: calc.nssfEmployee,
      nssf_employer: calc.nssfEmployer,
      employee_name: calc.employeeName
    });
  }

  // Record tax liabilities
  await (supabase.from('tax_tracking').insert([
    {
      tenant_id: batch.tenantId,
      tax_type: 'PAYE',
      tax_rate: 0,
      tax_amount: batch.totalPayeTax,
      tax_base: batch.totalGrossPay,
      period_start: batch.payPeriodStart.toISOString().split('T')[0],
      period_end: batch.payPeriodEnd.toISOString().split('T')[0],
      status: 'pending'
    },
    {
      tenant_id: batch.tenantId,
      tax_type: 'NSSF',
      tax_rate: 15,
      tax_amount: batch.totalNssfEmployee + batch.totalNssfEmployer,
      tax_base: batch.totalGrossPay,
      period_start: batch.payPeriodStart.toISOString().split('T')[0],
      period_end: batch.payPeriodEnd.toISOString().split('T')[0],
      status: 'pending'
    }
  ] as any) as any);

  // Update records to approved
  await (supabase
    .from('payroll_records')
    .update({ status: 'approved' } as any)
    .in('id', records.map((r: any) => r.id)) as any);

  return records;
}

export async function markPayrollAsPaid(
  tenantId: string,
  payrollIds: string[],
  paymentDate: Date,
  paymentMethod: string
) {
  const { error } = await (supabase
    .from('payroll_records')
    .update({
      status: 'paid',
      payment_date: paymentDate.toISOString().split('T')[0],
      payment_method: paymentMethod
    } as any)
    .in('id', payrollIds) as any);

  if (error) throw error;
}

export async function getPayrollHistory(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  let query = supabase
    .from('payroll_records')
    .select(`
      *,
      employees (
        full_name,
        email,
        role
      )
    `)
    .eq('tenant_id', tenantId)
    .order('pay_period_end', { ascending: false });

  if (startDate) {
    query = query.gte('pay_period_start', startDate.toISOString().split('T')[0]);
  }
  if (endDate) {
    query = query.lte('pay_period_end', endDate.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPayrollSummary(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: monthlyPayroll } = await supabase
    .from('payroll_records')
    .select('base_salary, net_salary, deductions')
    .eq('tenant_id', tenantId)
    .gte('pay_period_start', startOfMonth.toISOString().split('T')[0])
    .lte('pay_period_end', endOfMonth.toISOString().split('T')[0]);

  // Use existing columns that are in the types
  return {
    monthlyGrossPay: monthlyPayroll?.reduce((sum, p) => sum + Number(p.base_salary || 0), 0) || 0,
    monthlyNetPay: monthlyPayroll?.reduce((sum, p) => sum + Number(p.net_salary || 0), 0) || 0,
    monthlyPayeTax: 0, // Will be calculated from the new columns when types update
    monthlyNssf: 0,
    employeeCount: monthlyPayroll?.length || 0
  };
}
