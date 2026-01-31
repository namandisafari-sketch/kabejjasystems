import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function AdminSponsors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    website_url: "",
    is_active: true,
    display_order: 0,
  });

  const { data: sponsors, isLoading } = useQuery({
    queryKey: ['admin-sponsors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Sponsor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('sponsors')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['public-sponsors'] });
      toast({ title: "Success", description: "Sponsor added successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('sponsors')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['public-sponsors'] });
      toast({ title: "Success", description: "Sponsor updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['public-sponsors'] });
      toast({ title: "Success", description: "Sponsor deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sponsors')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['public-sponsors'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (sponsor?: Sponsor) => {
    if (sponsor) {
      setEditingSponsor(sponsor);
      setFormData({
        name: sponsor.name,
        logo_url: sponsor.logo_url,
        website_url: sponsor.website_url || "",
        is_active: sponsor.is_active,
        display_order: sponsor.display_order,
      });
    } else {
      setEditingSponsor(null);
      setFormData({
        name: "",
        logo_url: "",
        website_url: "",
        is_active: true,
        display_order: (sponsors?.length || 0) + 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSponsor(null);
    setFormData({
      name: "",
      logo_url: "",
      website_url: "",
      is_active: true,
      display_order: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSponsor) {
      updateMutation.mutate({ id: editingSponsor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this sponsor?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sponsors & Partners</h1>
          <p className="text-muted-foreground">
            Manage the sponsor logos that appear on the landing page marquee
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sponsor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Sponsors</CardTitle>
          <CardDescription>
            Logos will scroll automatically on the landing page. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sponsors...</div>
          ) : sponsors && sponsors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((sponsor, index) => (
                  <TableRow key={sponsor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-10 w-20 bg-muted rounded flex items-center justify-center overflow-hidden">
                        {sponsor.logo_url ? (
                          <img 
                            src={sponsor.logo_url} 
                            alt={sponsor.name}
                            className="max-h-8 max-w-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sponsor.name}</TableCell>
                    <TableCell>
                      {sponsor.website_url ? (
                        <a 
                          href={sponsor.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={sponsor.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: sponsor.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(sponsor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sponsor.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No sponsors yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first sponsor to display on the landing page
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sponsor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      {sponsors && sponsors.filter(s => s.is_active).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>
              This is how the sponsor marquee will appear on the landing page
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-muted/30 rounded-lg py-6 overflow-hidden">
            <div className="flex animate-marquee">
              {[...sponsors.filter(s => s.is_active), ...sponsors.filter(s => s.is_active)].map((sponsor, index) => (
                <div
                  key={`preview-${sponsor.id}-${index}`}
                  className="flex-shrink-0 mx-6 flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all"
                >
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="max-h-10 max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSponsor ? "Edit Sponsor" : "Add New Sponsor"}
            </DialogTitle>
            <DialogDescription>
              {editingSponsor 
                ? "Update the sponsor details below" 
                : "Add a new sponsor logo to display on the landing page"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Sponsor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Airtel Uganda"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL *</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                required
              />
              {formData.logo_url && (
                <div className="mt-2 p-4 bg-muted rounded-lg flex items-center justify-center">
                  <img 
                    src={formData.logo_url} 
                    alt="Preview" 
                    className="max-h-12 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL (optional)</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active (visible on landing page)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSponsor ? "Save Changes" : "Add Sponsor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
