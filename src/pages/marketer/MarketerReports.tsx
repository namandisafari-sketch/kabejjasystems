import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { FileText, TrendingUp } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface Marketer {
  id: string;
  name: string;
  email: string | null;
  referral_code: string;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

export default function MarketerReports() {
  const { marketer } = useOutletContext<{ marketer: Marketer }>();

  // Fetch all referrals for analysis
  const { data: allReferrals = [] } = useQuery({
    queryKey: ["marketer-reports-referrals", marketer?.referral_code],
    enabled: !!marketer?.referral_code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_type, status, created_at")
        .eq("referred_by_code", marketer.referral_code)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate monthly referrals for the last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthReferrals = allReferrals.filter(r => {
      const createdAt = new Date(r.created_at);
      return createdAt >= monthStart && createdAt <= monthEnd;
    });

    return {
      month: format(date, 'MMM'),
      total: monthReferrals.length,
      active: monthReferrals.filter(r => r.status === 'active').length,
      pending: monthReferrals.filter(r => r.status === 'pending').length,
    };
  });

  // Status distribution
  const statusData = [
    { name: 'Active', value: allReferrals.filter(r => r.status === 'active').length },
    { name: 'Pending', value: allReferrals.filter(r => r.status === 'pending').length },
    { name: 'Suspended', value: allReferrals.filter(r => r.status === 'suspended').length },
  ].filter(d => d.value > 0);

  // Business type distribution
  const businessTypes = allReferrals.reduce((acc, r) => {
    const type = r.business_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const businessTypeData = Object.entries(businessTypes)
    .map(([name, value]) => ({ 
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Analytics and insights about your referrals
        </p>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Referral Trend
          </CardTitle>
          <CardDescription>
            Number of referrals over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar dataKey="active" name="Active" fill="#22c55e" stackId="a" />
                <Bar dataKey="pending" name="Pending" fill="#eab308" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Status Distribution
            </CardTitle>
            <CardDescription>
              Current status of all your referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Business Types
            </CardTitle>
            <CardDescription>
              Types of businesses you've referred
            </CardDescription>
          </CardHeader>
          <CardContent>
            {businessTypeData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="space-y-4">
                {businessTypeData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.value}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${(item.value / allReferrals.length) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{allReferrals.length}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {allReferrals.filter(r => r.status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Accounts</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {allReferrals.length > 0 
                  ? Math.round((allReferrals.filter(r => r.status === 'active').length / allReferrals.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{Object.keys(businessTypes).length}</p>
              <p className="text-sm text-muted-foreground">Business Types</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
