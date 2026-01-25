// Main accounting module exports
export * from './chart-of-accounts';
export * from './transaction-recorder';
export * from './statements';
export * from './tax-calculator';
export * from './payroll';

// Utility function to format currency in UGX
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Get period label
export function getPeriodLabel(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  if (startMonth === endMonth) {
    return startMonth;
  }
  return `${startMonth} - ${endMonth}`;
}

// Date helpers for accounting periods
export function getMonthDateRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

export function getQuarterDateRange(date: Date = new Date()): { start: Date; end: Date } {
  const quarter = Math.floor(date.getMonth() / 3);
  const start = new Date(date.getFullYear(), quarter * 3, 1);
  const end = new Date(date.getFullYear(), quarter * 3 + 3, 0);
  return { start, end };
}

export function getYearDateRange(year: number = new Date().getFullYear()): { start: Date; end: Date } {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end };
}
