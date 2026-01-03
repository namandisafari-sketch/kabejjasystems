import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, db, lovableClient } from "@/hooks/use-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, DollarSign, UserPlus, TrendingUp, Plus, Copy, Check, Key } from "lucide-react";

export default function AdminMarketers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState<{ id: string; name: string } | null>(null);
  const [loginCredentials, setLoginCredentials] = useState({ email: "", password: "" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newMarketer, setNewMarketer] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    daily_rate: 0,
  });

  // Fetch marketers
  const { data: marketers, isLoading } = useQuery({
    queryKey: ["admin-marketers"],
    queryFn: async () => {
      const { data, error } = await db
        .from("marketers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch referral stats
  const { data: referralStats } = useQuery({
    queryKey: ["admin-referral-stats"],
    queryFn: async () => {
      const { data: tenants, error } = await db
        .from("tenants")
        .select("referred_by_code, status")
        .not("referred_by_code", "is", null);

      if (error) throw error;

      const referralCounts: Record<string, { total: number; approved: number }> = {};
      tenants?.forEach((t) => {
        if (t.referred_by_code) {
          if (!referralCounts[t.referred_by_code]) {
            referralCounts[t.referred_by_code] = { total: 0, approved: 0 };
          }
          referralCounts[t.referred_by_code].total++;
          if (t.status === "active") {
            referralCounts[t.referred_by_code].approved++;
          }
        }
      });

      return referralCounts;
    },
  });

  // Create marketer directly in database (without auth account)
  const createMarketerMutation = useMutation({
    mutationFn: async (data: typeof newMarketer) => {
      const referralCode = "MKT" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: marketer, error } = await db
        .from("marketers")
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          daily_rate: data.daily_rate || 0,
          referral_code: referralCode,
        })
        .select()
        .single();
      
      if (error) throw error;
      return marketer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketers"] });
      toast({ title: "Marketer created successfully", description: "You can add login credentials later from the marketer portal on your self-hosted Supabase." });
      setIsDialogOpen(false);
      setNewMarketer({ name: "", email: "", phone: "", password: "", daily_rate: 0 });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await db
        .from("marketers")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketers"] });
      toast({ title: "Status updated" });
    },
  });

  // Link login - disabled for now (requires self-hosted Supabase admin access)
  const linkLoginMutation = useMutation({
    mutationFn: async (data: { marketer_id: string; email: string; password: string }) => {
      // This would need to be done directly on the self-hosted Supabase
      throw new Error('Login credentials must be created directly on your self-hosted Supabase dashboard. Create a user with the marketer role, then update the marketer record with the user_id.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketers"] });
      toast({ title: "Login credentials added successfully" });
      setIsLoginDialogOpen(false);
      setSelectedMarketer(null);
      setLoginCredentials({ email: "", password: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Manual Setup Required", description: error.message, variant: "destructive" });
    },
  });

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Calculate stats
  const totalMarketers = marketers?.length || 0;
  const activeMarketers = marketers?.filter((m) => m.is_active).length || 0;
  const totalReferrals = marketers?.reduce((acc, m) => acc + (m.total_referrals || 0), 0) || 0;
  const totalEarned = marketers?.reduce((acc, m) => acc + Number(m.total_earned || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketers</h1>
          <p className="text-muted-foreground">
            Manage marketers, track referrals and commissions. 
            <a href="/marketer" target="_blank" className="text-primary hover:underline ml-1">
              Marketer Portal →
            </a>
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Marketer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Marketer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newMarketer.name}
                  onChange={(e) => setNewMarketer({ ...newMarketer, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Login)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMarketer.email}
                  onChange={(e) => setNewMarketer({ ...newMarketer, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newMarketer.password}
                  onChange={(e) => setNewMarketer({ ...newMarketer, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newMarketer.phone}
                  onChange={(e) => setNewMarketer({ ...newMarketer, phone: e.target.value })}
                  placeholder="+256..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_rate">Daily Rate (UGX)</Label>
                <Input
                  id="daily_rate"
                  type="number"
                  value={newMarketer.daily_rate}
                  onChange={(e) =>
                    setNewMarketer({ ...newMarketer, daily_rate: Number(e.target.value) })
                  }
                  placeholder="50000"
                />
              </div>
              <Button
                onClick={() => createMarketerMutation.mutate(newMarketer)}
                disabled={!newMarketer.name || !newMarketer.email || !newMarketer.password || newMarketer.password.length < 6 || createMarketerMutation.isPending}
                className="w-full"
              >
                {createMarketerMutation.isPending ? "Creating Account..." : "Create Marketer Account"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Marketer will sign in at <code className="bg-muted px-1 rounded">/marketer</code> with these credentials
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Marketers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMarketers}</div>
            <p className="text-xs text-muted-foreground">{activeMarketers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All time signups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved Signups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketers?.reduce((acc, m) => acc + (m.approved_signups || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Converted to active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Commissions paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Marketers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Marketers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : marketers?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No marketers yet. Add your first marketer to start tracking referrals.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead className="text-center">Referrals</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketers?.map((marketer) => {
                  const stats = referralStats?.[marketer.referral_code] || { total: 0, approved: 0 };
                  return (
                    <TableRow key={marketer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {marketer.name}
                          {marketer.user_id && (
                            <Badge variant="outline" className="text-xs">
                              <Key className="h-3 w-3 mr-1" />
                              Has Login
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {marketer.email && <div>{marketer.email}</div>}
                          {marketer.phone && (
                            <div className="text-muted-foreground">{marketer.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {marketer.referral_code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyReferralCode(marketer.referral_code)}
                          >
                            {copiedCode === marketer.referral_code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{stats.total}</TableCell>
                      <TableCell className="text-center">{stats.approved}</TableCell>
                      <TableCell className="text-right">
                        UGX {Number(marketer.total_earned || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={marketer.is_active ? "default" : "secondary"}>
                          {marketer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!marketer.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMarketer({ id: marketer.id, name: marketer.name });
                                setLoginCredentials({ email: marketer.email || "", password: "" });
                                setIsLoginDialogOpen(true);
                              }}
                            >
                              <Key className="h-3 w-3 mr-1" />
                              Setup Login
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleActiveMutation.mutate({
                                id: marketer.id,
                                isActive: marketer.is_active || false,
                              })
                            }
                          >
                            {marketer.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Setup Login Dialog */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Login for {selectedMarketer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email (Login)</Label>
              <Input
                id="login-email"
                type="email"
                value={loginCredentials.email}
                onChange={(e) => setLoginCredentials({ ...loginCredentials, email: e.target.value })}
                placeholder="marketer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                placeholder="Min 6 characters"
              />
            </div>
            <Button
              onClick={() => selectedMarketer && linkLoginMutation.mutate({
                marketer_id: selectedMarketer.id,
                email: loginCredentials.email,
                password: loginCredentials.password,
              })}
              disabled={!loginCredentials.email || !loginCredentials.password || loginCredentials.password.length < 6 || linkLoginMutation.isPending}
              className="w-full"
            >
              {linkLoginMutation.isPending ? "Setting up..." : "Create Login Credentials"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Marketer will sign in at <code className="bg-muted px-1 rounded">/marketer</code>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
