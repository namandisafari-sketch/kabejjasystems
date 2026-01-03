import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Building2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface Marketer {
  id: string;
  name: string;
  email: string | null;
  referral_code: string;
}

export default function MarketerReferrals() {
  const { marketer } = useOutletContext<{ marketer: Marketer }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["marketer-all-referrals", marketer?.referral_code],
    enabled: !!marketer?.referral_code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_type, status, created_at, phone, email")
        .eq("referred_by_code", marketer.referral_code)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    active: referrals.filter(r => r.status === 'active').length,
    suspended: referrals.filter(r => r.status === 'suspended').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Referrals</h1>
        <p className="text-muted-foreground">
          All businesses that signed up using your referral code
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("pending")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("active")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("suspended")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{statusCounts.suspended}</div>
            <p className="text-sm text-muted-foreground">Suspended</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Referred Businesses
          </CardTitle>
          <CardDescription>
            Track the status of all businesses you've referred
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {referrals.length === 0 
                ? "No referrals yet. Share your link to start earning!"
                : "No referrals match your filters."
              }
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">{referral.name}</TableCell>
                      <TableCell className="capitalize">
                        {referral.business_type?.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {referral.email && <div>{referral.email}</div>}
                          {referral.phone && (
                            <div className="text-muted-foreground">{referral.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            referral.status === 'active' ? 'default' : 
                            referral.status === 'pending' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {referral.status}
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
