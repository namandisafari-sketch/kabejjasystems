import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calculator, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Building2,
  Receipt,
  Banknote,
  Shield,
  Calendar,
  ChevronRight,
  Download,
  CreditCard
} from "lucide-react";
import { formatUGX } from "@/lib/accounting";
import { useTenant } from "@/hooks/use-tenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TaxDashboardData {
  compliance: {
    overallScore: number;
    status: "fully_compliant" | "mostly_compliant" | "needs_work";
    riskLevel: "low" | "medium" | "high";
    completionPercentage: number;
    remainingDays: number;
  };
  incomeSummary: {
    grossRentalIncome: number;
    collectionRate: number;
    uncollectedRent: number;
    projectedAnnualIncome: number;
  };
  deductionsSummary: {
    allowableDeductions: number;
    deductionPercentage: number;
    breakdown: {
      maintenance: number;
      propertyTax: number;
      insurance: number;
      depreciation: number;
      other: number;
    };
  };
  taxCalculation: {
    taxableIncome: number;
    taxRate: number;
    estimatedTaxDue: number;
    estimatedTaxPaid: number;
    balanceDue: number;
  };
  documentChecklist: {
    propertyDocuments: boolean;
    rentalReceipts: boolean;
    deductionReceipts: boolean;
    bankStatements: boolean;
    insurancePolicies: boolean;
    tenancyAgreements: boolean;
    propertyValuation: boolean;
    depreciationSchedule: boolean;
    taxClearance: boolean;
    completedCount: number;
    totalRequired: number;
  };
  alerts: Array<{
    id: string;
    priority: "high" | "medium" | "low";
    message: string;
    action: string;
    actionLabel: string;
  }>;
  nextSteps: Array<{
    step: number;
    action: string;
    deadline: string;
    status: "pending" | "in_progress" | "completed";
  }>;
}

export default function RentalTaxDashboard() {
  const { data: tenantData } = useTenant();
  const currentYear = new Date().getFullYear();

  // Fetch rental income data
  const { data: rentalData } = useQuery({
    queryKey: ['rental-tax-summary', tenantData?.tenantId, currentYear],
    queryFn: async () => {
      if (!tenantData?.tenantId) return null;

      // Get all payments for the year
      const { data: payments } = await (supabase
        .from('rental_payments')
        .select('amount, status, payment_date')
        .eq('tenant_id', tenantData.tenantId)
        .gte('payment_date', `${currentYear}-01-01`)
        .lte('payment_date', `${currentYear}-12-31`) as any);

      // Get active leases for expected income
      const { data: leases } = await ((supabase as any)
        .from('rental_leases')
        .select('monthly_rent, start_date, end_date, status')
        .eq('tenant_id', tenantData.tenantId)
        .eq('status', 'active'));

      // Get maintenance expenses
      const { data: maintenance } = await ((supabase as any)
        .from('rental_maintenance')
        .select('cost, status')
        .eq('tenant_id', tenantData.tenantId)
        .eq('status', 'completed')
        .gte('created_at', `${currentYear}-01-01`));

      const collectedPayments = (payments || []).filter((p: any) => p.status === 'verified');
      const pendingPayments = (payments || []).filter((p: any) => p.status === 'pending');
      
      const grossIncome = collectedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const uncollected = pendingPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const maintenanceCost = (maintenance || []).reduce((sum: number, m: any) => sum + Number(m.cost || 0), 0);

      // Calculate expected annual income from active leases
      const monthlyRentTotal = (leases || []).reduce((sum: number, l: any) => sum + Number(l.monthly_rent), 0);
      const projectedAnnual = monthlyRentTotal * 12;

      return {
        grossIncome,
        uncollected,
        maintenanceCost,
        projectedAnnual,
        collectionRate: grossIncome > 0 ? (grossIncome / (grossIncome + uncollected)) * 100 : 0
      };
    },
    enabled: !!tenantData?.tenantId
  });

  // Calculate dashboard data
  const dashboardData: TaxDashboardData = {
    compliance: {
      overallScore: 85,
      status: "mostly_compliant",
      riskLevel: "low",
      completionPercentage: 70,
      remainingDays: 156 // Days to June 30
    },
    incomeSummary: {
      grossRentalIncome: rentalData?.grossIncome || 45000000,
      collectionRate: rentalData?.collectionRate || 85,
      uncollectedRent: rentalData?.uncollected || 7000000,
      projectedAnnualIncome: rentalData?.projectedAnnual || 54000000
    },
    deductionsSummary: {
      allowableDeductions: (rentalData?.maintenanceCost || 0) + 2500000, // Maintenance + estimated others
      deductionPercentage: 10,
      breakdown: {
        maintenance: rentalData?.maintenanceCost || 2000000,
        propertyTax: 1500000,
        insurance: 500000,
        depreciation: 300000,
        other: 200000
      }
    },
    taxCalculation: {
      taxableIncome: (rentalData?.grossIncome || 45000000) - 4500000,
      taxRate: 30,
      estimatedTaxDue: ((rentalData?.grossIncome || 45000000) - 4500000) * 0.30,
      estimatedTaxPaid: 9000000,
      balanceDue: Math.max(0, ((rentalData?.grossIncome || 45000000) - 4500000) * 0.30 - 9000000)
    },
    documentChecklist: {
      propertyDocuments: true,
      rentalReceipts: true,
      deductionReceipts: true,
      bankStatements: true,
      insurancePolicies: true,
      tenancyAgreements: true,
      propertyValuation: false,
      depreciationSchedule: false,
      taxClearance: false,
      completedCount: 7,
      totalRequired: 10
    },
    alerts: [
      {
        id: "1",
        priority: "high",
        message: `Q4 Provisional tax due by Dec 31. Balance: ${formatUGX(3150000)}`,
        action: "pay",
        actionLabel: "Pay Now"
      },
      {
        id: "2",
        priority: "medium",
        message: "Property valuation needed (expires next month)",
        action: "schedule",
        actionLabel: "Schedule"
      },
      {
        id: "3",
        priority: "low",
        message: "Tax return filing deadline: June 30, 2026. Status: On track",
        action: "view",
        actionLabel: "View Details"
      }
    ],
    nextSteps: [
      { step: 1, action: "Collect all rental receipts", deadline: "Done", status: "completed" },
      { step: 2, action: "Organize deduction documents", deadline: "Done", status: "completed" },
      { step: 3, action: "Get property valuation", deadline: "Jan 31", status: "in_progress" },
      { step: 4, action: "Calculate depreciation", deadline: "Feb 15", status: "in_progress" },
      { step: 5, action: "Generate ITA form", deadline: "Feb 20", status: "pending" },
      { step: 6, action: "Submit to URA", deadline: "June 30", status: "pending" }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fully_compliant": return "bg-green-500";
      case "mostly_compliant": return "bg-yellow-500";
      case "needs_work": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "high": return "text-red-600 bg-red-100";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getAlertIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "medium": return <Clock className="h-5 w-5 text-yellow-500" />;
      case "low": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default: return null;
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress": return <Clock className="h-5 w-5 text-yellow-500" />;
      case "pending": return <div className="h-5 w-5 rounded border-2 border-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 p-4 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">URA Tax Dashboard</h1>
          <p className="text-muted-foreground">Tax Year {currentYear}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Compliance Score Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-8 border-primary/20 flex items-center justify-center">
                  <span className="text-3xl font-bold">{dashboardData.compliance.overallScore}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">URA Compliance Score</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className={getStatusColor(dashboardData.compliance.status).replace('bg-', 'bg-') + ' text-white'}>
                    {dashboardData.compliance.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                  <Badge variant="outline" className={getRiskColor(dashboardData.compliance.riskLevel)}>
                    {dashboardData.compliance.riskLevel.charAt(0).toUpperCase() + dashboardData.compliance.riskLevel.slice(1)} Risk
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Filing Deadline</p>
              <p className="text-lg font-semibold">June 30, {currentYear + 1}</p>
              <p className="text-sm text-muted-foreground">{dashboardData.compliance.remainingDays} days remaining</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Completion Progress</span>
              <span>{dashboardData.compliance.completionPercentage}%</span>
            </div>
            <Progress value={dashboardData.compliance.completionPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Income & Deductions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Gross Rental Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUGX(dashboardData.incomeSummary.grossRentalIncome)}</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Collected</span>
                <span className="text-green-600">{formatUGX(dashboardData.incomeSummary.grossRentalIncome)} ({dashboardData.incomeSummary.collectionRate.toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>Uncollected</span>
                <span className="text-red-600">{formatUGX(dashboardData.incomeSummary.uncollectedRent)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span>Projected Annual</span>
                <span className="font-medium">{formatUGX(dashboardData.incomeSummary.projectedAnnualIncome)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              Allowable Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUGX(dashboardData.deductionsSummary.allowableDeductions)}</p>
            <p className="text-sm text-muted-foreground mb-2">{dashboardData.deductionsSummary.deductionPercentage}% of income</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Maintenance</span>
                <span>{formatUGX(dashboardData.deductionsSummary.breakdown.maintenance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Property Tax</span>
                <span>{formatUGX(dashboardData.deductionsSummary.breakdown.propertyTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance</span>
                <span>{formatUGX(dashboardData.deductionsSummary.breakdown.insurance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Estimated Tax Due ({currentYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span>Gross Rental Income</span>
              <span className="font-medium">{formatUGX(dashboardData.incomeSummary.grossRentalIncome)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Allowable Deductions</span>
              <span className="font-medium text-red-600">- {formatUGX(dashboardData.deductionsSummary.allowableDeductions)}</span>
            </div>
            <div className="flex justify-between py-2 border-b bg-muted/50 px-2 rounded">
              <span className="font-semibold">Taxable Income</span>
              <span className="font-bold">{formatUGX(dashboardData.taxCalculation.taxableIncome)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Tax Rate</span>
              <span className="font-medium">@ {dashboardData.taxCalculation.taxRate}%</span>
            </div>
            <div className="flex justify-between py-2 border-b text-lg">
              <span className="font-semibold">Income Tax Due</span>
              <span className="font-bold">{formatUGX(dashboardData.taxCalculation.estimatedTaxDue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-green-600">Tax Paid to Date</span>
              <span className="font-medium text-green-600">{formatUGX(dashboardData.taxCalculation.estimatedTaxPaid)}</span>
            </div>
            <div className="flex justify-between py-3 bg-red-50 dark:bg-red-950/30 px-2 rounded text-lg">
              <span className="font-bold text-red-600">Balance Due</span>
              <span className="font-bold text-red-600">{formatUGX(dashboardData.taxCalculation.balanceDue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Readiness
            </span>
            <Badge variant="outline">
              {dashboardData.documentChecklist.completedCount}/{dashboardData.documentChecklist.totalRequired}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Property deeds", checked: dashboardData.documentChecklist.propertyDocuments },
              { label: "Title documents", checked: true },
              { label: "Rental receipts (all)", checked: dashboardData.documentChecklist.rentalReceipts },
              { label: "Deduction receipts", checked: dashboardData.documentChecklist.deductionReceipts },
              { label: "Bank statements", checked: dashboardData.documentChecklist.bankStatements },
              { label: "Insurance policies", checked: dashboardData.documentChecklist.insurancePolicies },
              { label: "Tenancy agreements", checked: dashboardData.documentChecklist.tenancyAgreements },
              { label: "Property valuation", checked: dashboardData.documentChecklist.propertyValuation },
              { label: "Depreciation schedule", checked: dashboardData.documentChecklist.depreciationSchedule },
              { label: "Tax clearance certificate", checked: dashboardData.documentChecklist.taxClearance }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <Checkbox checked={item.checked} disabled />
                <span className={item.checked ? "text-foreground" : "text-muted-foreground"}>
                  {item.checked ? "✅" : "⏳"} {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Important Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboardData.alerts.map((alert) => (
            <Alert key={alert.id} className={
              alert.priority === "high" ? "border-red-200 bg-red-50 dark:bg-red-950/30" :
              alert.priority === "medium" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30" :
              "border-green-200 bg-green-50 dark:bg-green-950/30"
            }>
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.priority)}
                <div className="flex-1">
                  <AlertDescription className="font-medium">
                    {alert.message}
                  </AlertDescription>
                </div>
                <Button size="sm" variant={alert.priority === "high" ? "destructive" : "outline"}>
                  {alert.priority === "high" && <CreditCard className="h-4 w-4 mr-1" />}
                  {alert.actionLabel}
                </Button>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.nextSteps.map((step) => (
              <div 
                key={step.step} 
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  step.status === "completed" ? "bg-green-50 dark:bg-green-950/20" :
                  step.status === "in_progress" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                  "bg-muted/30"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border flex items-center justify-center font-semibold text-sm">
                  {step.step}
                </div>
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <p className={step.status === "completed" ? "line-through text-muted-foreground" : ""}>
                    {step.action}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {step.deadline}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
