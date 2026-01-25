import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  FileText,
  Calculator,
  PiggyBank,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  generateIncomeStatement, 
  generateBalanceSheet,
  IncomeStatement,
  BalanceSheet 
} from '@/lib/accounting/statements';
import { getTaxSummary } from '@/lib/accounting/tax-calculator';
import { getPayrollSummary } from '@/lib/accounting/payroll';
import { formatUGX, getMonthDateRange, getYearDateRange } from '@/lib/accounting';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface FinancialDashboardProps {
  tenantId: string;
}

export function FinancialDashboard({ tenantId }: FinancialDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { start: monthStart, end: monthEnd } = getMonthDateRange();
  const { start: yearStart, end: yearEnd } = getYearDateRange();

  // Fetch income statement
  const { data: incomeStatement, isLoading: isLoadingStatement, refetch: refetchStatement } = useQuery({
    queryKey: ['income-statement', tenantId, monthStart.toISOString()],
    queryFn: () => generateIncomeStatement(tenantId, monthStart, monthEnd),
    enabled: !!tenantId,
  });

  // Fetch YTD income statement
  const { data: ytdStatement } = useQuery({
    queryKey: ['ytd-statement', tenantId, yearStart.toISOString()],
    queryFn: () => generateIncomeStatement(tenantId, yearStart, yearEnd),
    enabled: !!tenantId,
  });

  // Fetch balance sheet
  const { data: balanceSheet, isLoading: isLoadingBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['balance-sheet', tenantId],
    queryFn: () => generateBalanceSheet(tenantId, new Date()),
    enabled: !!tenantId,
  });

  // Fetch tax summary
  const { data: taxSummary, refetch: refetchTax } = useQuery({
    queryKey: ['tax-summary', tenantId],
    queryFn: () => getTaxSummary(tenantId),
    enabled: !!tenantId,
  });

  // Fetch payroll summary
  const { data: payrollSummary, refetch: refetchPayroll } = useQuery({
    queryKey: ['payroll-summary', tenantId],
    queryFn: () => getPayrollSummary(tenantId),
    enabled: !!tenantId,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchStatement(),
      refetchBalance(),
      refetchTax(),
      refetchPayroll()
    ]);
    setIsRefreshing(false);
  };

  const isLoading = isLoadingStatement || isLoadingBalance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Financial Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time financial overview for {monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={incomeStatement?.revenue.total || 0}
          subtitle="This month"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
          trend={incomeStatement?.revenue.total ? 'up' : undefined}
        />
        <MetricCard
          title="Net Profit"
          value={incomeStatement?.netProfit || 0}
          subtitle={`${incomeStatement?.netMarginPercent?.toFixed(1) || 0}% margin`}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
          trend={incomeStatement?.netProfit && incomeStatement.netProfit > 0 ? 'up' : 'down'}
          valueColor={incomeStatement?.netProfit && incomeStatement.netProfit >= 0 ? 'text-success' : 'text-destructive'}
        />
        <MetricCard
          title="Gross Margin"
          value={incomeStatement?.grossMarginPercent || 0}
          subtitle="Target: 40%+"
          icon={<Percent className="h-4 w-4" />}
          isLoading={isLoading}
          isPercent
          trend={(incomeStatement?.grossMarginPercent || 0) >= 40 ? 'up' : 'down'}
        />
        <MetricCard
          title="Tax Due"
          value={taxSummary?.totalDue || 0}
          subtitle={taxSummary?.nextDueDate ? `Due: ${taxSummary.nextDueDate.toLocaleDateString()}` : 'No taxes due'}
          icon={<Calculator className="h-4 w-4" />}
          isLoading={isLoading}
          valueColor={taxSummary?.totalDue && taxSummary.totalDue > 0 ? 'text-warning' : undefined}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pnl" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pnl">Income Statement</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="taxes">Tax Summary</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <IncomeStatementCard statement={incomeStatement} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="balance">
          <BalanceSheetCard balanceSheet={balanceSheet} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="taxes">
          <TaxSummaryCard taxSummary={taxSummary} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollSummaryCard payrollSummary={payrollSummary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  trend?: 'up' | 'down';
  isPercent?: boolean;
  valueColor?: string;
}

function MetricCard({ title, value, subtitle, icon, isLoading, trend, isPercent, valueColor }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${valueColor || ''}`}>
              {isPercent ? `${value.toFixed(1)}%` : formatUGX(value)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
              {subtitle}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Income Statement Card
function IncomeStatementCard({ statement, isLoading }: { statement?: IncomeStatement; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Income Statement (P&L)
        </CardTitle>
        <CardDescription>{statement?.period}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Revenue Section */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm uppercase text-muted-foreground">Revenue</h4>
            <LineItem label="Sales Revenue" value={statement?.revenue.sales || 0} />
            <LineItem label="Service Income" value={statement?.revenue.serviceIncome || 0} />
            <LineItem label="Other Income" value={statement?.revenue.otherIncome || 0} />
            {(statement?.revenue.discounts || 0) > 0 && (
              <LineItem label="Less: Discounts" value={-(statement?.revenue.discounts || 0)} isNegative />
            )}
            <LineItem label="Total Revenue" value={statement?.revenue.total || 0} isTotal />
          </div>

          {/* COGS */}
          <div className="space-y-2 pt-2 border-t">
            <LineItem label="Cost of Goods Sold" value={-(statement?.costOfGoodsSold || 0)} isNegative />
            <LineItem 
              label="Gross Profit" 
              value={statement?.grossProfit || 0} 
              isTotal 
              badge={`${statement?.grossMarginPercent?.toFixed(1)}%`}
            />
          </div>

          {/* Operating Expenses */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-sm uppercase text-muted-foreground">Operating Expenses</h4>
            {statement?.operatingExpenses.salaries ? <LineItem label="Salaries & Wages" value={statement.operatingExpenses.salaries} isExpense /> : null}
            {statement?.operatingExpenses.rent ? <LineItem label="Rent" value={statement.operatingExpenses.rent} isExpense /> : null}
            {statement?.operatingExpenses.utilities ? <LineItem label="Utilities" value={statement.operatingExpenses.utilities} isExpense /> : null}
            {statement?.operatingExpenses.marketing ? <LineItem label="Marketing" value={statement.operatingExpenses.marketing} isExpense /> : null}
            {statement?.operatingExpenses.other ? <LineItem label="Other Expenses" value={statement.operatingExpenses.other} isExpense /> : null}
            <LineItem label="Total Operating Expenses" value={-(statement?.operatingExpenses.total || 0)} isTotal isNegative />
          </div>

          {/* Net Profit */}
          <div className="space-y-2 pt-4 border-t-2">
            <LineItem 
              label="Net Profit" 
              value={statement?.netProfit || 0} 
              isTotal 
              isHighlight
              badge={`${statement?.netMarginPercent?.toFixed(1)}% margin`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Balance Sheet Card
function BalanceSheetCard({ balanceSheet, isLoading }: { balanceSheet?: BalanceSheet; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Balance Sheet
        </CardTitle>
        <CardDescription>
          As of {balanceSheet?.asOfDate?.toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase text-muted-foreground">Assets</h4>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Current Assets</p>
              <LineItem label="Cash" value={balanceSheet?.assets.current.cash || 0} small />
              <LineItem label="Bank" value={balanceSheet?.assets.current.bank || 0} small />
              <LineItem label="Accounts Receivable" value={balanceSheet?.assets.current.accountsReceivable || 0} small />
              <LineItem label="Inventory" value={balanceSheet?.assets.current.inventory || 0} small />
              <LineItem label="Total Current Assets" value={balanceSheet?.assets.current.total || 0} isTotal small />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Fixed Assets</p>
              <LineItem label="Equipment" value={balanceSheet?.assets.fixed.equipment || 0} small />
              <LineItem label="Total Fixed Assets" value={balanceSheet?.assets.fixed.total || 0} isTotal small />
            </div>
            <LineItem label="TOTAL ASSETS" value={balanceSheet?.assets.total || 0} isTotal isHighlight />
          </div>

          {/* Liabilities & Equity */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase text-muted-foreground">Liabilities & Equity</h4>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Current Liabilities</p>
              <LineItem label="Accounts Payable" value={balanceSheet?.liabilities.current.accountsPayable || 0} small />
              <LineItem label="VAT Payable" value={balanceSheet?.liabilities.current.vatPayable || 0} small />
              <LineItem label="PAYE Payable" value={balanceSheet?.liabilities.current.payePayable || 0} small />
              <LineItem label="Total Current Liabilities" value={balanceSheet?.liabilities.current.total || 0} isTotal small />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Equity</p>
              <LineItem label="Owner's Capital" value={balanceSheet?.equity.capital || 0} small />
              <LineItem label="Retained Earnings" value={balanceSheet?.equity.retainedEarnings || 0} small />
              <LineItem label="Total Equity" value={balanceSheet?.equity.total || 0} isTotal small />
            </div>
            <LineItem label="TOTAL LIABILITIES & EQUITY" value={balanceSheet?.totalLiabilitiesAndEquity || 0} isTotal isHighlight />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Tax Summary Card
function TaxSummaryCard({ taxSummary }: { taxSummary?: ReturnType<typeof getTaxSummary> extends Promise<infer T> ? T : never }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tax Summary
        </CardTitle>
        <CardDescription>Pending tax obligations</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">VAT Payable</p>
                <p className="text-xl font-bold">{formatUGX(taxSummary?.vatDue || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">PAYE Tax</p>
                <p className="text-xl font-bold">{formatUGX(taxSummary?.payeDue || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">NSSF</p>
                <p className="text-xl font-bold">{formatUGX(taxSummary?.nssfDue || 0)}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Total Tax Due</p>
                <p className="text-sm text-muted-foreground">
                  Due by {taxSummary?.nextDueDate?.toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold">{formatUGX(taxSummary?.totalDue || 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Payroll Summary Card
function PayrollSummaryCard({ payrollSummary }: { payrollSummary?: ReturnType<typeof getPayrollSummary> extends Promise<infer T> ? T : never }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Payroll Summary
        </CardTitle>
        <CardDescription>This month's payroll overview</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="text-2xl font-bold">{payrollSummary?.employeeCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Gross Pay</p>
              <p className="text-xl font-bold">{formatUGX(payrollSummary?.monthlyGrossPay || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">PAYE Tax</p>
              <p className="text-xl font-bold">{formatUGX(payrollSummary?.monthlyPayeTax || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Net Pay</p>
              <p className="text-xl font-bold">{formatUGX(payrollSummary?.monthlyNetPay || 0)}</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

// Line Item Component
interface LineItemProps {
  label: string;
  value: number;
  isTotal?: boolean;
  isNegative?: boolean;
  isExpense?: boolean;
  isHighlight?: boolean;
  badge?: string;
  small?: boolean;
}

function LineItem({ label, value, isTotal, isNegative, isExpense, isHighlight, badge, small }: LineItemProps) {
  const textClass = small ? 'text-sm' : '';
  const valueClass = `${textClass} ${isTotal ? 'font-semibold' : ''} ${isHighlight ? 'text-lg font-bold' : ''} ${value < 0 || isNegative ? 'text-destructive' : ''}`;
  
  return (
    <div className={`flex justify-between items-center ${isTotal ? 'pt-1 border-t' : ''} ${isHighlight ? 'bg-primary/5 p-2 rounded-md' : ''}`}>
      <span className={`${textClass} ${isTotal ? 'font-semibold' : ''}`}>{label}</span>
      <div className="flex items-center gap-2">
        {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        <span className={valueClass}>
          {isExpense ? `(${formatUGX(Math.abs(value))})` : formatUGX(value)}
        </span>
      </div>
    </div>
  );
}

export default FinancialDashboard;
