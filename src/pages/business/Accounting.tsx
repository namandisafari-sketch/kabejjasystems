import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calculator, Settings, BookOpen, TrendingUp } from 'lucide-react';
import { FinancialDashboard } from '@/components/accounting/FinancialDashboard';
import { ChartOfAccountsManager } from '@/components/accounting/ChartOfAccountsManager';

const Accounting = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Get user profile to get tenant_id
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      return data;
    },
  });

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile?.tenant_id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Unable to load accounting data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Accounting
        </h1>
        <p className="text-muted-foreground">
          Automated financial management, reporting, and tax compliance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">General Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FinancialDashboard tenantId={profile.tenant_id} />
        </TabsContent>

        <TabsContent value="ledger">
          <GeneralLedgerView tenantId={profile.tenant_id} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsView tenantId={profile.tenant_id} />
        </TabsContent>

        <TabsContent value="settings">
          <ChartOfAccountsManager tenantId={profile.tenant_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// General Ledger View
function GeneralLedgerView({ tenantId }: { tenantId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['general-ledger', tenantId],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const { data } = await (supabase
        .from('general_ledger')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(100) as any);

      return data || [];
    },
    enabled: !!tenantId,
  });

  const formatUGX = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          General Ledger
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : entries?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No ledger entries yet.</p>
            <p className="text-sm">Transactions will be recorded automatically when you make sales, purchases, or record expenses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Reference</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Debit Account</th>
                  <th className="text-right py-2">Debit</th>
                  <th className="text-left py-2">Credit Account</th>
                  <th className="text-right py-2">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entries?.map((entry: any) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="py-2">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-2 font-mono text-xs">{entry.reference_number || '-'}</td>
                    <td className="py-2 max-w-[200px] truncate">{entry.description || '-'}</td>
                    <td className="py-2 font-mono text-xs">{entry.debit_account || '-'}</td>
                    <td className="py-2 text-right">{entry.debit_amount > 0 ? formatUGX(entry.debit_amount) : '-'}</td>
                    <td className="py-2 font-mono text-xs">{entry.credit_account || '-'}</td>
                    <td className="py-2 text-right">{entry.credit_amount > 0 ? formatUGX(entry.credit_amount) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Reports View - Placeholder that links to existing Reports page
function ReportsView({ tenantId }: { tenantId: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <ReportCard 
        title="Income Statement" 
        description="Profit & Loss statement for any period"
        icon={<FileText className="h-8 w-8" />}
      />
      <ReportCard 
        title="Balance Sheet" 
        description="Assets, liabilities, and equity snapshot"
        icon={<FileText className="h-8 w-8" />}
      />
      <ReportCard 
        title="Cash Flow Statement" 
        description="Track cash inflows and outflows"
        icon={<FileText className="h-8 w-8" />}
      />
      <ReportCard 
        title="VAT Return" 
        description="Monthly VAT calculation and filing"
        icon={<Calculator className="h-8 w-8" />}
      />
      <ReportCard 
        title="Payroll Report" 
        description="Employee payroll and tax deductions"
        icon={<Calculator className="h-8 w-8" />}
      />
      <ReportCard 
        title="Tax Return" 
        description="Annual income tax return preparation"
        icon={<Calculator className="h-8 w-8" />}
      />
    </div>
  );
}

function ReportCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="text-primary">{icon}</div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-4 w-full">
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}

export default Accounting;
