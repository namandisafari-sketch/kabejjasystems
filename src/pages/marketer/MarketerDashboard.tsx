import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Copy, 
  Check,
  Clock,
  Building2
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface Marketer {
  id: string;
  name: string;
  email: string | null;
  referral_code: string;
}

export default function MarketerDashboard() {
  const { marketer } = useOutletContext<{ marketer: Marketer }>();
  const [copied, setCopied] = useState(false);

  // Fetch marketer stats
  const { data: stats } = useQuery({
    queryKey: ["marketer-stats", marketer?.id],
    enabled: !!marketer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketers")
        .select("total_referrals, approved_signups, total_earned, daily_rate")
        .eq("id", marketer.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent referrals
  const { data: recentReferrals = [] } = useQuery({
    queryKey: ["marketer-recent-referrals", marketer?.referral_code],
    enabled: !!marketer?.referral_code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_type, status, created_at")
        .eq("referred_by_code", marketer.referral_code)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pending installations
  const { data: pendingInstallations = [] } = useQuery({
    queryKey: ["marketer-installations", marketer?.referral_code],
    enabled: !!marketer?.referral_code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_purchases")
        .select("id, business_name, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  const copyReferralCode = () => {
    navigator.clipboard.writeText(marketer?.referral_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const signupUrl = `${window.location.origin}/signup?ref=${marketer?.referral_code}`;

  const copySignupLink = () => {
    navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {marketer?.name}!</h1>
          <p className="text-muted-foreground">
            Track your referrals and earnings from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your Code:</span>
            <code className="font-bold text-lg">{marketer?.referral_code}</code>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyReferralCode}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_referrals || 0}</div>
            <p className="text-xs text-muted-foreground">Businesses signed up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved_signups || 0}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_referrals ? 
                Math.round((stats.approved_signups / stats.total_referrals) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Approved / Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {Number(stats?.total_earned || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Rate: UGX {Number(stats?.daily_rate || 0).toLocaleString()}/day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Share Section */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with potential customers to earn commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-muted rounded-lg p-3 font-mono text-sm break-all">
              {signupUrl}
            </div>
            <Button onClick={copySignupLink} className="shrink-0">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Referrals
            </CardTitle>
            <CardDescription>Your latest business sign-ups</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReferrals.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No referrals yet. Share your link to start earning!
              </p>
            ) : (
              <div className="space-y-3">
                {recentReferrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{referral.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {referral.business_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(referral.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Installations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Installations
            </CardTitle>
            <CardDescription>Installations awaiting setup</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInstallations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No pending installations at the moment.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingInstallations.map((installation) => (
                  <div key={installation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{installation.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(installation.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline">{installation.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
