import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, AlertTriangle, Clock, CheckCircle, Edit } from "lucide-react";
import { format } from "date-fns";

export default function RentalMaintenance() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [formData, setFormData] = useState({
    unit_id: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'open',
    scheduled_date: '',
    estimated_cost: '',
    contractor_name: '',
    contractor_phone: '',
    reported_by: '',
    resolution_notes: '',
  });

  const { data: units = [] } = useQuery({
    queryKey: ['rental-units-all', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_units')
        .select('*, rental_properties(name)')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['maintenance-requests', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, rental_units(unit_number, rental_properties(name))')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('maintenance_requests').insert({
        tenant_id: tenantId,
        request_number: '', // Auto-generated
        unit_id: data.unit_id,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        scheduled_date: data.scheduled_date || null,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
        contractor_name: data.contractor_name || null,
        contractor_phone: data.contractor_phone || null,
        reported_by: data.reported_by || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      setOpen(false);
      resetForm();
      toast({ title: "Maintenance request created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase.from('maintenance_requests')
        .update({
          ...updateData,
          scheduled_date: updateData.scheduled_date || null,
          estimated_cost: updateData.estimated_cost ? parseFloat(updateData.estimated_cost) : null,
          actual_cost: updateData.status === 'completed' && updateData.estimated_cost 
            ? parseFloat(updateData.estimated_cost) : null,
          completed_date: updateData.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      setOpen(false);
      setEditingRequest(null);
      resetForm();
      toast({ title: "Request updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      unit_id: '',
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      status: 'open',
      scheduled_date: '',
      estimated_cost: '',
      contractor_name: '',
      contractor_phone: '',
      reported_by: '',
      resolution_notes: '',
    });
  };

  const handleEdit = (request: any) => {
    setEditingRequest(request);
    setFormData({
      unit_id: request.unit_id,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      status: request.status,
      scheduled_date: request.scheduled_date || '',
      estimated_cost: request.estimated_cost?.toString() || '',
      contractor_name: request.contractor_name || '',
      contractor_phone: request.contractor_phone || '',
      reported_by: request.reported_by || '',
      resolution_notes: request.resolution_notes || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRequest) {
      updateMutation.mutate({ ...formData, id: editingRequest.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return <Badge variant="destructive">Emergency</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const inProgressRequests = requests.filter(r => ['in_progress', 'scheduled'].includes(r.status));
  const completedRequests = requests.filter(r => r.status === 'completed');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Track and manage maintenance requests</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingRequest(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRequest ? 'Update Request' : 'New Maintenance Request'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit_id} onValueChange={v => setFormData({ ...formData, unit_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {(u.rental_properties as any)?.name} - {u.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Issue Title</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of issue"
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingRequest && (
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label>Contractor Name</Label>
                  <Input
                    value={formData.contractor_name}
                    onChange={e => setFormData({ ...formData, contractor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contractor Phone</Label>
                  <Input
                    value={formData.contractor_phone}
                    onChange={e => setFormData({ ...formData, contractor_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estimated Cost (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={e => setFormData({ ...formData, estimated_cost: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Reported By</Label>
                  <Input
                    value={formData.reported_by}
                    onChange={e => setFormData({ ...formData, reported_by: e.target.value })}
                    placeholder="Tenant name"
                  />
                </div>
                {editingRequest && (
                  <div className="col-span-2">
                    <Label>Resolution Notes</Label>
                    <Textarea
                      value={formData.resolution_notes}
                      onChange={e => setFormData({ ...formData, resolution_notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRequest ? 'Update' : 'Create'} Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRequests.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressRequests.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(request => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{(request.rental_units as any)?.unit_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(request.rental_units as any)?.rental_properties?.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{request.description}</p>
                  </TableCell>
                  <TableCell className="capitalize">{request.category}</TableCell>
                  <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(request)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No maintenance requests yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}