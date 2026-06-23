/**
 * GST Calculation Utilities for Uganda 18% Compliance
 * Uganda Standard GST Rate: 18%
 */

export const GST_STANDARD_RATE = 18; // 18% standard rate for Uganda
export const GST_STANDARD_RATE_DECIMAL = 0.18;

/**
 * Calculate GST amount for a given price
 * @param price - Price before GST
 * @param gstRate - GST rate percentage (default: 18%)
 * @returns GST amount
 */
export function calculateGSTAmount(price: number, gstRate: number = GST_STANDARD_RATE): number {
  return Math.round((price * gstRate / 100) * 100) / 100;
}

/**
 * Calculate total price including GST
 * @param price - Price before GST
 * @param gstRate - GST rate percentage (default: 18%)
 * @returns Total price including GST
 */
export function calculatePriceWithGST(price: number, gstRate: number = GST_STANDARD_RATE): number {
  const gstAmount = calculateGSTAmount(price, gstRate);
  return Math.round((price + gstAmount) * 100) / 100;
}

/**
 * Calculate subtotal (price before GST) from a total including GST
 * @param totalWithGST - Total price including GST
 * @param gstRate - GST rate percentage (default: 18%)
 * @returns Subtotal before GST
 */
export function extractSubtotalFromTotal(totalWithGST: number, gstRate: number = GST_STANDARD_RATE): number {
  const divisor = 1 + (gstRate / 100);
  return Math.round((totalWithGST / divisor) * 100) / 100;
}

/**
 * Calculate GST breakdown for a sale
 * @param totalAmount - Total amount paid by customer
 * @param isGSTInclusive - Whether the total includes GST or not
 * @param gstRate - GST rate percentage
 * @returns Object with subtotal, gst_amount, and total
 */
export function calculateGSTBreakdown(
  totalAmount: number,
  isGSTInclusive: boolean = true,
  gstRate: number = GST_STANDARD_RATE
): {
  subtotal: number;
  gst_amount: number;
  total: number;
  gst_rate: number;
} {
  if (isGSTInclusive) {
    const subtotal = extractSubtotalFromTotal(totalAmount, gstRate);
    const gstAmount = Math.round((totalAmount - subtotal) * 100) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gst_amount: Math.round(gstAmount * 100) / 100,
      total: totalAmount,
      gst_rate: gstRate,
    };
  } else {
    const gstAmount = calculateGSTAmount(totalAmount, gstRate);
    const total = Math.round((totalAmount + gstAmount) * 100) / 100;
    return {
      subtotal: totalAmount,
      gst_amount: Math.round(gstAmount * 100) / 100,
      total,
      gst_rate: gstRate,
    };
  }
}

/**
 * Format currency for Uganda (UGX)
 * @param amount - Amount to format
 * @returns Formatted string
 */
export function formatUGXCurrency(amount: number): string {
  return amount.toLocaleString('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency for display (without currency symbol, just number)
 * @param amount - Amount to format
 * @returns Formatted string with thousands separator
 */
export function formatCurrencyAmount(amount: number): string {
  return amount.toLocaleString('en-UG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Validate GST calculation
 * @param subtotal - Subtotal before GST
 * @param gstAmount - GST amount charged
 * @param total - Total amount
 * @param gstRate - Expected GST rate
 * @returns true if calculation is correct, false otherwise
 */
export function validateGSTCalculation(
  subtotal: number,
  gstAmount: number,
  total: number,
  gstRate: number = GST_STANDARD_RATE
): boolean {
  const expectedGST = calculateGSTAmount(subtotal, gstRate);
  const expectedTotal = subtotal + expectedGST;

  // Allow for small rounding differences (0.01)
  return (
    Math.abs(gstAmount - expectedGST) < 0.01 &&
    Math.abs(total - expectedTotal) < 0.01
  );
}

/**
 * Calculate GST compliance summary for a date range
 * @param sales - Array of sales records
 * @param startDate - Start date of period
 * @param endDate - End date of period
 * @returns Compliance summary
 */
export function calculateGSTComplianceSummary(
  sales: Array<{
    gst_amount: number;
    total_amount: number;
    subtotal?: number;
  }>,
  startDate: Date,
  endDate: Date
): {
  taxable_sales: number;
  exempt_sales: number;
  total_gst_collected: number;
  total_sales: number;
  average_gst_rate: number;
  period_start: Date;
  period_end: Date;
} {
  let taxableSales = 0;
  let exemptSales = 0;
  let totalGST = 0;

  sales.forEach((sale) => {
    if (sale.gst_amount > 0) {
      taxableSales += sale.subtotal || (sale.total_amount - sale.gst_amount);
      totalGST += sale.gst_amount;
    } else {
      exemptSales += sale.total_amount;
    }
  });

  const totalSales = taxableSales + exemptSales;
  const averageGSTRate = totalSales > 0 ? (totalGST / taxableSales) * 100 : 0;

  return {
    taxable_sales: Math.round(taxableSales * 100) / 100,
    exempt_sales: Math.round(exemptSales * 100) / 100,
    total_gst_collected: Math.round(totalGST * 100) / 100,
    total_sales: Math.round(totalSales * 100) / 100,
    average_gst_rate: Math.round(averageGSTRate * 100) / 100,
    period_start: startDate,
    period_end: endDate,
  };
}

/**
 * Determine if a product should be GST taxed
 * @param productPrice - Product price
 * @param isExempt - Whether product is marked as GST exempt
 * @param customRate - Custom GST rate (optional)
 * @returns Object with taxable status and rate
 */
export function determineTaxability(
  productPrice: number,
  isExempt: boolean = false,
  customRate?: number
): {
  is_taxable: boolean;
  effective_rate: number;
  gst_amount: number;
} {
  const effectiveRate = isExempt ? 0 : (customRate || GST_STANDARD_RATE);
  const gstAmount = isExempt ? 0 : calculateGSTAmount(productPrice, effectiveRate);

  return {
    is_taxable: !isExempt,
    effective_rate: effectiveRate,
    gst_amount: Math.round(gstAmount * 100) / 100,
  };
}
