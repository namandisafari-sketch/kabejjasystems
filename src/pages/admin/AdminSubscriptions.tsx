import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { format, differenceInDays, addMonths, addDays } from "date-fns";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [extensionDays, setExtensionDays] = useState(30);

  // Fetch tenants with subscription info
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          packages:package_id (name, price)
        `)
        .order("subscription_end_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Extend subscription mutation
  const extendSubscriptionMutation = useMutation({
    mutationFn: async ({ tenantId, days }: { tenantId: string; days: number }) => {
      const tenant = tenants?.find((t) => t.id === tenantId);
      const currentEndDate = tenant?.subscription_end_date
        ? new Date(tenant.subscription_end_date)
        : new Date();
      
      const newEndDate = addDays(currentEndDate, days);

      const { error } = await supabase
        .from("tenants")
        .update({
          subscription_end_date: newEndDate.toISOString(),
          status: "active",
        })
        .eq("id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({ title: "Subscription extended successfully" });
      setSelectedTenant(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Suspend/activate subscription mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ tenantId, newStatus }: { tenantId: string; newStatus: "active" | "pending" | "rejected" | "suspended" }) => {
      const { error } = await supabase
        .from("tenants")
        .update({ status: newStatus })
        .eq("id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate subscription status
  const getSubscriptionStatus = (tenant: any) => {
    if (tenant.status === "suspended") return { status: "suspended", variant: "destructive" as const };
    if (tenant.status === "pending") return { status: "pending", variant: "secondary" as const };
    
    if (!tenant.subscription_end_date) return { status: "no subscription", variant: "outline" as const };
    
    const daysRemaining = differenceInDays(new Date(tenant.subscription_end_date), new Date());
    
    if (daysRemaining < 0) return { status: "expired", variant: "destructive" as const };
    if (daysRemaining <= 7) return { status: `${daysRemaining}d left`, variant: "outline" as const };
    if (daysRemaining <= 30) return { status: `${daysRemaining}d left`, variant: "secondary" as const };
    return { status: "active", variant: "default" as const };
  };

  // Stats
  const activeCount = tenants?.filter((t) => t.status === "active").length || 0;
  const expiringCount = tenants?.filter((t) => {
    if (!t.subscription_end_date) return false;
    const days = differenceInDays(new Date(t.subscription_end_date), new Date());
    return days >= 0 && days <= 7;
  }).length || 0;
  const expiredCount = tenants?.filter((t) => {
    if (!t.subscription_end_date) return false;
    return differenceInDays(new Date(t.subscription_end_date), new Date()) < 0;
  }).length || 0;
  const suspendedCount = tenants?.filter((t) => t.status === "suspended").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage tenant subscriptions, renewals and expirations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Subscriptions running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringCount}</div>
            <p className="text-xs text-muted-foreground">Within 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspendedCount}</div>
            <p className="text-xs text-muted-foreground">Manually suspended</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map((tenant) => {
                  const subStatus = getSubscriptionStatus(tenant);
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tenant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {tenant.business_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.packages?.name || (
                          <span className="text-muted-foreground">No package</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.subscription_end_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(tenant.subscription_end_date), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subStatus.variant}>{subStatus.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTenant(tenant)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Extend
                          </Button>
                          {tenant.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  tenantId: tenant.id,
                                  newStatus: "suspended",
                                })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  tenantId: tenant.id,
                                  newStatus: "active",
                                })
                              }
                            >
                              Activate
                            </Button>
                          )}
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

      {/* Extension Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">{selectedTenant.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current expiry:{" "}
                  {selectedTenant.subscription_end_date
                    ? format(new Date(selectedTenant.subscription_end_date), "MMM d, yyyy")
                    : "Not set"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Extension Period</Label>
                <Select
                  value={extensionDays.toString()}
                  onValueChange={(v) => setExtensionDays(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days (1 month)</SelectItem>
                    <SelectItem value="90">90 days (3 months)</SelectItem>
                    <SelectItem value="180">180 days (6 months)</SelectItem>
                    <SelectItem value="365">365 days (1 year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-sm text-green-700 dark:text-green-300">
                  New expiry date:{" "}
                  <strong>
                    {format(
                      addDays(
                        selectedTenant.subscription_end_date
                          ? new Date(selectedTenant.subscription_end_date)
                          : new Date(),
                        extensionDays
                      ),
                      "MMMM d, yyyy"
                    )}
                  </strong>
                </div>
              </div>

              <Button
                onClick={() =>
                  extendSubscriptionMutation.mutate({
                    tenantId: selectedTenant.id,
                    days: extensionDays,
                  })
                }
                disabled={extendSubscriptionMutation.isPending}
                className="w-full"
              >
                {extendSubscriptionMutation.isPending ? "Extending..." : "Extend Subscription"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
