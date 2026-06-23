import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { formatCurrencyAmount, GST_STANDARD_RATE } from '@/lib/gst-calculations';

interface GSTPricingDisplayProps {
  subtotal: number;
  gstAmount?: number;
  total: number;
  gstRate?: number;
  showBreakdown?: boolean;
  showGSTBadge?: boolean;
  currency?: string;
  isExempt?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Component to display pricing with GST breakdown
 * Shows:
 * - Subtotal
 * - GST (18% standard rate)
 * - Total including GST
 *
 * Usage:
 * <GSTPricingDisplay subtotal={1000} total={1180} />
 */
export function GSTPricingDisplay({
  subtotal,
  gstAmount,
  total,
  gstRate = GST_STANDARD_RATE,
  showBreakdown = true,
  showGSTBadge = true,
  currency = 'UGX',
  isExempt = false,
  variant = 'default',
}: GSTPricingDisplayProps) {
  // Calculate GST if not provided
  const calculatedGST = gstAmount || (subtotal * gstRate / 100);
  const displayGST = Math.round(calculatedGST * 100) / 100;

  return (
    <div className="w-full">
      {variant === 'compact' ? (
        // Compact inline display
        <div className="text-sm space-y-1">
          {showBreakdown && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>{formatCurrencyAmount(subtotal)} {currency}</span>
              </div>
              {!isExempt && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST ({gstRate}%):</span>
                  <span>{formatCurrencyAmount(displayGST)} {currency}</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>Total:</span>
            <span>{formatCurrencyAmount(total)} {currency}</span>
          </div>
        </div>
      ) : variant === 'detailed' ? (
        // Detailed card display
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Pricing Breakdown</span>
              {!isExempt && showGSTBadge && (
                <Badge variant="outline">GST {gstRate}%</Badge>
              )}
              {isExempt && showGSTBadge && (
                <Badge variant="secondary">GST Exempt</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrencyAmount(subtotal)}</span>
              </div>
              {!isExempt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    GST @ {gstRate}%
                  </span>
                  <span className="font-medium text-blue-600">
                    +{formatCurrencyAmount(displayGST)}
                  </span>
                </div>
              )}
              {isExempt && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>This item is GST exempt</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total {currency}</span>
                <span>{formatCurrencyAmount(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Default display
        <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
          {showBreakdown && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrencyAmount(subtotal)}</span>
              </div>
              {!isExempt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST ({gstRate}%):</span>
                  <span className="text-blue-600 font-medium">
                    {formatCurrencyAmount(displayGST)}
                  </span>
                </div>
              )}
              {isExempt && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>GST Exempt</span>
                </div>
              )}
            </>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total {currency}:</span>
            <span>{formatCurrencyAmount(total)}</span>
          </div>
          {showGSTBadge && (
            <div className="flex justify-end">
              {!isExempt && (
                <Badge variant="outline" className="text-xs">
                  18% GST Applied
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GSTPricingDisplay;
