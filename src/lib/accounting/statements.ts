import { supabase } from '@/integrations/supabase/client';

export interface IncomeStatement {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  revenue: {
    sales: number;
    serviceIncome: number;
    otherIncome: number;
    discounts: number;
    returns: number;
    total: number;
  };
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    depreciation: number;
    insurance: number;
    officeSupplies: number;
    transport: number;
    professional: number;
    repairs: number;
    other: number;
    total: number;
  };
  operatingProfit: number;
  operatingMarginPercent: number;
  otherExpenses: {
    bankCharges: number;
    interestExpense: number;
    total: number;
  };
  netProfit: number;
  netMarginPercent: number;
}

export interface BalanceSheet {
  asOfDate: Date;
  assets: {
    current: {
      cash: number;
      bank: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      total: number;
    };
    fixed: {
      equipment: number;
      furniture: number;
      vehicles: number;
      accumulatedDepreciation: number;
      total: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      accountsPayable: number;
      vatPayable: number;
      payePayable: number;
      nssfPayable: number;
      wagesPayable: number;
      total: number;
    };
    longTerm: {
      loansPayable: number;
      total: number;
    };
    total: number;
  };
  equity: {
    capital: number;
    drawings: number;
    retainedEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
}

export async function generateIncomeStatement(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<IncomeStatement> {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  // Get all ledger entries for the period
  const { data: entries } = await (supabase
    .from('general_ledger')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('date', start)
    .lte('date', end) as any);

  // Calculate totals by account
  const totals: Record<string, { debit: number; credit: number }> = {};
  
  for (const entry of entries || []) {
    const debitAcc = entry.debit_account;
    const creditAcc = entry.credit_account;
    
    if (debitAcc) {
      if (!totals[debitAcc]) totals[debitAcc] = { debit: 0, credit: 0 };
      totals[debitAcc].debit += Number(entry.debit_amount) || 0;
    }
    if (creditAcc) {
      if (!totals[creditAcc]) totals[creditAcc] = { debit: 0, credit: 0 };
      totals[creditAcc].credit += Number(entry.credit_amount) || 0;
    }
  }

  // Calculate income (credits to income accounts)
  const sales = totals['SALES']?.credit || 0;
  const serviceIncome = totals['SERVICE_INCOME']?.credit || 0;
  const otherIncome = totals['OTHER_INCOME']?.credit || 0;
  const discounts = totals['DISCOUNTS']?.debit || 0;
  const returns = totals['RETURNS']?.debit || 0;
  const totalRevenue = sales + serviceIncome + otherIncome - discounts - returns;

  // Cost of goods sold
  const cogs = totals['COGS']?.debit || 0;
  const grossProfit = totalRevenue - cogs;

  // Operating expenses
  const salaries = totals['SALARY']?.debit || 0;
  const rent = totals['RENT']?.debit || 0;
  const utilities = totals['UTILITIES']?.debit || 0;
  const marketing = totals['MARKETING']?.debit || 0;
  const depreciation = totals['DEPRECIATION']?.debit || 0;
  const insurance = totals['INSURANCE']?.debit || 0;
  const officeSupplies = totals['OFFICE_SUPPLIES']?.debit || 0;
  const transport = totals['TRANSPORT']?.debit || 0;
  const professional = totals['PROFESSIONAL']?.debit || 0;
  const repairs = totals['REPAIRS']?.debit || 0;
  const otherExpenses = totals['MISC_EXPENSE']?.debit || 0;

  const totalOperatingExpenses = salaries + rent + utilities + marketing + depreciation + 
    insurance + officeSupplies + transport + professional + repairs + otherExpenses;

  const operatingProfit = grossProfit - totalOperatingExpenses;

  // Other expenses
  const bankCharges = totals['BANK_CHARGES']?.debit || 0;
  const interestExpense = totals['INTEREST_EXPENSE']?.debit || 0;
  const totalOtherExpenses = bankCharges + interestExpense;

  const netProfit = operatingProfit - totalOtherExpenses;

  const statement: IncomeStatement = {
    period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    periodStart: startDate,
    periodEnd: endDate,
    revenue: {
      sales,
      serviceIncome,
      otherIncome,
      discounts,
      returns,
      total: totalRevenue
    },
    costOfGoodsSold: cogs,
    grossProfit,
    grossMarginPercent: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    operatingExpenses: {
      salaries,
      rent,
      utilities,
      marketing,
      depreciation,
      insurance,
      officeSupplies,
      transport,
      professional,
      repairs,
      other: otherExpenses,
      total: totalOperatingExpenses
    },
    operatingProfit,
    operatingMarginPercent: totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0,
    otherExpenses: {
      bankCharges,
      interestExpense,
      total: totalOtherExpenses
    },
    netProfit,
    netMarginPercent: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  };

  // Cache the statement
  await (supabase.from('financial_statements_cache').insert({
    tenant_id: tenantId,
    statement_type: 'INCOME_STATEMENT',
    period_start: start,
    period_end: end,
    statement_json: statement as any,
    generated_at: new Date().toISOString()
  } as any) as any);

  return statement;
}

export async function generateBalanceSheet(
  tenantId: string,
  asOfDate: Date
): Promise<BalanceSheet> {
  // Get account balances from chart of accounts
  const { data: accounts } = await (supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true) as any);

  const balances: Record<string, number> = {};
  for (const acc of accounts || []) {
    balances[acc.account_code] = Number(acc.balance) || 0;
  }

  const balanceSheet: BalanceSheet = {
    asOfDate,
    assets: {
      current: {
        cash: balances['CASH'] || 0,
        bank: balances['BANK'] || 0,
        accountsReceivable: balances['AR'] || 0,
        inventory: balances['INVENTORY'] || 0,
        prepaidExpenses: balances['PREPAID'] || 0,
        total: 0
      },
      fixed: {
        equipment: balances['EQUIPMENT'] || 0,
        furniture: balances['FURNITURE'] || 0,
        vehicles: balances['VEHICLES'] || 0,
        accumulatedDepreciation: balances['ACCUM_DEPR'] || 0,
        total: 0
      },
      total: 0
    },
    liabilities: {
      current: {
        accountsPayable: balances['AP'] || 0,
        vatPayable: balances['VAT_PAYABLE'] || 0,
        payePayable: balances['PAYE_PAYABLE'] || 0,
        nssfPayable: balances['NSSF_PAYABLE'] || 0,
        wagesPayable: balances['WAGES_PAYABLE'] || 0,
        total: 0
      },
      longTerm: {
        loansPayable: balances['LOAN'] || 0,
        total: 0
      },
      total: 0
    },
    equity: {
      capital: balances['CAPITAL'] || 0,
      drawings: balances['DRAWINGS'] || 0,
      retainedEarnings: balances['RETAINED_EARNINGS'] || 0,
      total: 0
    },
    totalLiabilitiesAndEquity: 0
  };

  // Calculate totals
  balanceSheet.assets.current.total = 
    balanceSheet.assets.current.cash +
    balanceSheet.assets.current.bank +
    balanceSheet.assets.current.accountsReceivable +
    balanceSheet.assets.current.inventory +
    balanceSheet.assets.current.prepaidExpenses;

  balanceSheet.assets.fixed.total = 
    balanceSheet.assets.fixed.equipment +
    balanceSheet.assets.fixed.furniture +
    balanceSheet.assets.fixed.vehicles -
    balanceSheet.assets.fixed.accumulatedDepreciation;

  balanceSheet.assets.total = 
    balanceSheet.assets.current.total + balanceSheet.assets.fixed.total;

  balanceSheet.liabilities.current.total = 
    balanceSheet.liabilities.current.accountsPayable +
    balanceSheet.liabilities.current.vatPayable +
    balanceSheet.liabilities.current.payePayable +
    balanceSheet.liabilities.current.nssfPayable +
    balanceSheet.liabilities.current.wagesPayable;

  balanceSheet.liabilities.longTerm.total = balanceSheet.liabilities.longTerm.loansPayable;

  balanceSheet.liabilities.total = 
    balanceSheet.liabilities.current.total + balanceSheet.liabilities.longTerm.total;

  balanceSheet.equity.total = 
    balanceSheet.equity.capital - 
    balanceSheet.equity.drawings + 
    balanceSheet.equity.retainedEarnings;

  balanceSheet.totalLiabilitiesAndEquity = 
    balanceSheet.liabilities.total + balanceSheet.equity.total;

  // Cache the balance sheet
  const dateStr = asOfDate.toISOString().split('T')[0];
  await (supabase.from('financial_statements_cache').insert({
    tenant_id: tenantId,
    statement_type: 'BALANCE_SHEET',
    period_start: dateStr,
    period_end: dateStr,
    statement_json: balanceSheet as any,
    generated_at: new Date().toISOString()
  } as any) as any);

  return balanceSheet;
}

export async function getCachedStatement(
  tenantId: string,
  statementType: string,
  periodStart: Date,
  periodEnd: Date
) {
  const { data } = await (supabase
    .from('financial_statements_cache')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('statement_type', statementType)
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .eq('period_end', periodEnd.toISOString().split('T')[0])
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle() as any);

  return data?.statement_json;
}
