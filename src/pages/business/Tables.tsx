import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/hooks/use-database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-red-500",
  reserved: "bg-yellow-500",
  cleaning: "bg-blue-500",
};

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  location: string | null;
  status: string;
}

const Tables = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [formData, setFormData] = useState({
    table_number: "",
    capacity: "4",
    location: "",
    status: "available",
  });

  const { data: profile } = useQuery({
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

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['restaurant-tables', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [] as RestaurantTable[];
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('table_number');
      if (error) throw error;
      return (data || []) as RestaurantTable[];
    },
    enabled: !!profile?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.tenant_id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('restaurant_tables')
        .insert({
          tenant_id: profile.tenant_id,
          table_number: data.table_number,
          capacity: parseInt(data.capacity),
          location: data.location || null,
          status: data.status,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      toast({ title: "Table added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({
          table_number: data.table_number,
          capacity: parseInt(data.capacity),
          location: data.location || null,
          status: data.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      toast({ title: "Table updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      toast({ title: "Table deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ table_number: "", capacity: "4", location: "", status: "available" });
    setEditingTable(null);
    setDialogOpen(false);
  };

  const handleEdit = (table: any) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
      location: table.location || "",
      status: table.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.table_number) {
      toast({ title: "Table number required", variant: "destructive" });
      return;
    }
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const groupedTables = tables.reduce((acc, table) => {
    const location = table.location || 'Main Floor';
    if (!acc[location]) acc[location] = [];
    acc[location].push(table);
    return acc;
  }, {} as Record<string, RestaurantTable[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Table Management</h1>
          <p className="text-muted-foreground">Configure your restaurant tables</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table_number">Table Number/Name</Label>
                <Input
                  id="table_number"
                  placeholder="e.g., T1, A1, Patio 1"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Seating Capacity</Label>
                <Select value={formData.capacity} onValueChange={(v) => setFormData({ ...formData, capacity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 4, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n} seats</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location/Area</Label>
                <Input
                  id="location"
                  placeholder="e.g., Indoor, Outdoor, Patio"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTable ? "Update" : "Add"} Table
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Legend */}
      <div className="flex gap-4 mb-6">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-sm capitalize">{status}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p>Loading tables...</p>
      ) : Object.keys(groupedTables).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tables configured yet</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTables).map(([location, locationTables]) => (
            <Card key={location}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {location}
                </CardTitle>
                <CardDescription>{locationTables.length} tables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {locationTables.map((table) => (
                    <Card key={table.id} className="relative group">
                      <CardContent className="p-4 text-center">
                        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusColors[table.status]}`} />
                        <div className="font-bold text-lg mb-1">{table.table_number}</div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                          <Users className="h-3 w-3" />
                          {table.capacity}
                        </div>
                        <Badge variant="outline" className="mt-2 capitalize text-xs">
                          {table.status}
                        </Badge>
                        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(table)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(table.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tables;
