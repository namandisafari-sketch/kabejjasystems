import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/hooks/use-database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Search, Eye, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminTenants = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: async () => {
      const { data, error } = await db
        .from('tenants')
        .select(`
          *,
          packages(name, price, currency)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredTenants = tenants?.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.business_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTenants = filteredTenants?.filter(t => t.status === 'pending') || [];
  const selectedPendingTenants = selectedTenants.filter(id => 
    pendingTenants.some(t => t.id === id)
  );

  const bulkApproveMutation = useMutation({
    mutationFn: async (tenantIds: string[]) => {
      const { error } = await db
        .from('tenants')
        .update({ 
          status: 'active',
          activated_at: new Date().toISOString()
        })
        .in('id', tenantIds);
      
      if (error) throw error;
    },
    onSuccess: (_, tenantIds) => {
      toast({
        title: "Tenants Approved",
        description: `Successfully approved ${tenantIds.length} tenant(s).`,
      });
      setSelectedTenants([]);
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Bulk Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (tenantIds: string[]) => {
      const { error } = await db
        .from('tenants')
        .update({ status: 'rejected' })
        .in('id', tenantIds);
      
      if (error) throw error;
    },
    onSuccess: (_, tenantIds) => {
      toast({
        title: "Tenants Rejected",
        description: `Successfully rejected ${tenantIds.length} tenant(s).`,
      });
      setSelectedTenants([]);
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Bulk Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const toggleAllPending = () => {
    if (selectedPendingTenants.length === pendingTenants.length) {
      setSelectedTenants(prev => prev.filter(id => !pendingTenants.some(t => t.id === id)));
    } else {
      setSelectedTenants(prev => [
        ...prev.filter(id => !pendingTenants.some(t => t.id === id)),
        ...pendingTenants.map(t => t.id)
      ]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string }> = {
      active: { variant: "default", label: "Active" },
      pending: { variant: "secondary", label: "Pending" },
      suspended: { variant: "destructive", label: "Suspended" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={status === 'active' ? 'bg-success' : ''}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Manage all registered businesses</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tenants</CardTitle>
              <CardDescription>
                {filteredTenants?.length || 0} total businesses registered
                {pendingTenants.length > 0 && ` • ${pendingTenants.length} pending approval`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {selectedPendingTenants.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedPendingTenants.length} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkRejectMutation.mutate(selectedPendingTenants)}
                    disabled={bulkRejectMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => bulkApproveMutation.mutate(selectedPendingTenants)}
                    disabled={bulkApproveMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading tenants...</p>
          ) : filteredTenants?.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tenants found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {pendingTenants.length > 0 && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            pendingTenants.length > 0 &&
                            selectedPendingTenants.length === pendingTenants.length
                          }
                          onCheckedChange={toggleAllPending}
                        />
                      </TableHead>
                    )}
                    <TableHead>Business Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants?.map((tenant) => (
                    <TableRow key={tenant.id}>
                      {pendingTenants.length > 0 && (
                        <TableCell>
                          {tenant.status === 'pending' && (
                            <Checkbox
                              checked={selectedTenants.includes(tenant.id)}
                              onCheckedChange={() => toggleTenantSelection(tenant.id)}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="capitalize">{tenant.business_type || 'N/A'}</TableCell>
                      <TableCell>{tenant.packages?.name || 'No package'}</TableCell>
                      <TableCell>{getStatusBadge(tenant.status || 'pending')}</TableCell>
                      <TableCell>
                        {new Date(tenant.created_at || '').toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
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
};

export default AdminTenants;
