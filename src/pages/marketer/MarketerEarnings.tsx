import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar, Wallet } from "lucide-react";
import { format } from "date-fns";

interface Marketer {
  id: string;
  name: string;
  email: string | null;
  referral_code: string;
}

export default function MarketerEarnings() {
  const { marketer } = useOutletContext<{ marketer: Marketer }>();

  // Fetch marketer earnings data
  const { data: marketerData } = useQuery({
    queryKey: ["marketer-earnings-data", marketer?.id],
    enabled: !!marketer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketers")
        .select("total_earned, daily_rate, approved_signups")
        .eq("id", marketer.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch approved referrals that count towards earnings
  const { data: approvedReferrals = [] } = useQuery({
    queryKey: ["marketer-approved-referrals", marketer?.referral_code],
    enabled: !!marketer?.referral_code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_type, created_at")
        .eq("referred_by_code", marketer.referral_code)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const dailyRate = Number(marketerData?.daily_rate || 0);
  const totalEarned = Number(marketerData?.total_earned || 0);
  const approvedCount = marketerData?.approved_signups || 0;
  
  // Calculate potential earnings from approved referrals
  const potentialEarnings = approvedCount * dailyRate;
  const pendingPayout = potentialEarnings - totalEarned;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground">
          Track your commissions and payouts
        </p>
      </div>

      {/* Earnings Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              UGX {totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Amount paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {dailyRate.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per approved signup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Signups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Qualified for commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              UGX {Math.max(0, pendingPayout).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown</CardTitle>
          <CardDescription>
            Commissions from approved business signups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4 mb-4 bg-muted/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Approved Signups</p>
                <p className="text-xl font-bold">{approvedCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">× Rate per Signup</p>
                <p className="text-xl font-bold">UGX {dailyRate.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">= Total Commission</p>
                <p className="text-xl font-bold">UGX {potentialEarnings.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Already Paid</p>
                <p className="text-xl font-bold text-green-600">UGX {totalEarned.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {approvedReferrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approved signups yet. Keep referring businesses!
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Approved Date</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedReferrals.map((referral, index) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">{referral.name}</TableCell>
                      <TableCell className="capitalize">
                        {referral.business_type?.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        UGX {dailyRate.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={index < Math.floor(totalEarned / dailyRate) ? "default" : "secondary"}>
                          {index < Math.floor(totalEarned / dailyRate) ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
