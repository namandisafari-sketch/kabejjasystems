import { useState, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, AlertTriangle, Clock, CheckCircle, Edit, Image as ImageIcon, X, Loader2, ZoomIn } from "lucide-react";
import { format } from "date-fns";

export default function RentalMaintenance() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
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

  const { data: allImages = [] } = useQuery({
    queryKey: ['maintenance-images', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('tenant_id', tenantId!);
      if (!reqs?.length) return [];
      const ids = reqs.map(r => r.id);
      const { data, error } = await supabase
        .from('maintenance_images')
        .select('*')
        .in('maintenance_request_id', ids)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const imagesByRequest = new Map<string, any[]>();
  allImages.forEach(img => {
    const existing = imagesByRequest.get(img.maintenance_request_id) || [];
    existing.push(img);
    imagesByRequest.set(img.maintenance_request_id, existing);
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newReq, error } = await supabase.from('maintenance_requests').insert({
        tenant_id: tenantId,
        request_number: '',
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
      }).select().single();
      if (error) throw error;
      if (imageFiles.length > 0 && newReq) {
        await uploadImages(newReq.id);
      }
      return newReq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-images'] });
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
      if (imageFiles.length > 0) {
        await uploadImages(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-images'] });
      setOpen(false);
      setEditingRequest(null);
      resetForm();
      toast({ title: "Request updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const uploadImages = async (requestId: string) => {
    setUploading(true);
    try {
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop();
        const filePath = `maintenance/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('rental-uploads')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('rental-uploads')
          .getPublicUrl(filePath);
        const { error: dbError } = await supabase.from('maintenance_images').insert({
          maintenance_request_id: requestId,
          image_url: publicUrl,
          caption: '',
        });
        if (dbError) throw dbError;
      }
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    imagePreviews.forEach(p => URL.revokeObjectURL(p));
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
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
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
    setExistingImages(imagesByRequest.get(request.id) || []);
    setImageFiles([]);
    setImagePreviews([]);
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
      case 'emergency': return <Badge variant="destructive">Emergency</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="border-blue-500 text-blue-600">Open</Badge>;
      case 'in_progress': return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'scheduled': return <Badge className="bg-purple-500">Scheduled</Badge>;
      case 'completed': return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const inProgressRequests = requests.filter(r => ['in_progress', 'scheduled'].includes(r.status));
  const completedRequests = requests.filter(r => r.status === 'completed');

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Maintenance photo" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} required />
                </div>
                <div>
                  <Label>Contractor Name</Label>
                  <Input value={formData.contractor_name} onChange={e => setFormData({ ...formData, contractor_name: e.target.value })} />
                </div>
                <div>
                  <Label>Contractor Phone</Label>
                  <Input value={formData.contractor_phone} onChange={e => setFormData({ ...formData, contractor_phone: e.target.value })} />
                </div>
                <div>
                  <Label>Estimated Cost (UGX)</Label>
                  <Input type="number" value={formData.estimated_cost} onChange={e => setFormData({ ...formData, estimated_cost: e.target.value })} />
                </div>
                <div>
                  <Label>Reported By</Label>
                  <Input value={formData.reported_by} onChange={e => setFormData({ ...formData, reported_by: e.target.value })} placeholder="Tenant name" />
                </div>
                {editingRequest && (
                  <div className="col-span-2">
                    <Label>Resolution Notes</Label>
                    <Textarea value={formData.resolution_notes} onChange={e => setFormData({ ...formData, resolution_notes: e.target.value })} rows={2} />
                  </div>
                )}
                <div className="col-span-2">
                  <Label>Photo Evidence</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {existingImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.image_url} alt="" className="h-16 w-16 object-cover rounded-md border cursor-pointer" onClick={() => setLightboxUrl(img.image_url)} />
                        <button type="button" className="absolute top-0 right-0 bg-black/50 rounded-full p-0.5 opacity-0 group-hover:opacity-100" onClick={() => setLightboxUrl(img.image_url)}>
                          <ZoomIn className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.map((preview, i) => (
                      <div key={`new-${i}`} className="relative group">
                        <img src={preview} alt="" className="h-16 w-16 object-cover rounded-md border" />
                        <button type="button" className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5" onClick={() => removeImage(i)}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-16 w-16 border-2 border-dashed rounded-md flex items-center justify-center hover:bg-muted/50 cursor-pointer"
                    >
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploading}>
                  {(createMutation.isPending || updateMutation.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingRequest ? 'Update' : 'Create'} Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                <TableHead>Photos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(request => {
                const imgs = imagesByRequest.get(request.id) || [];
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{(request.rental_units as any)?.unit_number}</p>
                        <p className="text-xs text-muted-foreground">{(request.rental_units as any)?.rental_properties?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{request.description}</p>
                    </TableCell>
                    <TableCell className="capitalize">{request.category}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>
                      {imgs.length > 0 ? (
                        <div className="flex -space-x-2">
                          {imgs.slice(0, 3).map((img, i) => (
                            <img key={i} src={img.image_url} alt="" className="h-7 w-7 rounded-full border-2 border-background object-cover cursor-pointer" onClick={() => setLightboxUrl(img.image_url)} />
                          ))}
                          {imgs.length > 3 && (
                            <span className="h-7 w-7 rounded-full border-2 border-background bg-muted text-xs flex items-center justify-center">+{imgs.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm">{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(request)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {requests.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
