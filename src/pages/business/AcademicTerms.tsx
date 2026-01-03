import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AcademicTerm {
  id: string;
  name: string;
  term_number: number;
  year: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export default function AcademicTerms() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    name: "",
    term_number: "1",
    year: currentYear.toString(),
    start_date: "",
    end_date: "",
  });

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['academic-terms', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('year', { ascending: false })
        .order('term_number', { ascending: false });
      if (error) throw error;
      return data as AcademicTerm[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('academic_terms').insert({
        tenant_id: tenantData!.tenantId,
        name: data.name,
        term_number: parseInt(data.term_number),
        year: parseInt(data.year),
        start_date: data.start_date,
        end_date: data.end_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
      toast({ title: "Term added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('academic_terms').update({
        name: data.name,
        term_number: parseInt(data.term_number),
        year: parseInt(data.year),
        start_date: data.start_date,
        end_date: data.end_date,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
      toast({ title: "Term updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (termId: string) => {
      // First, unset all current terms for this tenant
      await supabase
        .from('academic_terms')
        .update({ is_current: false })
        .eq('tenant_id', tenantData!.tenantId);
      
      // Then set the selected one as current
      const { error } = await supabase
        .from('academic_terms')
        .update({ is_current: true })
        .eq('id', termId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
      toast({ title: "Current term updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('academic_terms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
      toast({ title: "Term deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      term_number: "1",
      year: currentYear.toString(),
      start_date: "",
      end_date: "",
    });
    setEditingTerm(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (term: AcademicTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      term_number: term.term_number.toString(),
      year: term.year.toString(),
      start_date: term.start_date,
      end_date: term.end_date,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTerm) {
      updateMutation.mutate({ ...formData, id: editingTerm.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Terms</h1>
          <p className="text-muted-foreground">Manage academic terms and sessions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Term
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTerm ? "Edit Term" : "Add Term"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Term Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Term 1 2025"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="term_number">Term Number *</Label>
                  <Input
                    id="term_number"
                    type="number"
                    min="1"
                    max="4"
                    value={formData.term_number}
                    onChange={e => setFormData({ ...formData, term_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2020"
                    max="2050"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTerm ? "Update" : "Add"} Term
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Terms</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : terms.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No terms yet</h3>
              <p className="text-muted-foreground">Add your first academic term to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term Name</TableHead>
                  <TableHead>Term #</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map(term => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell>{term.term_number}</TableCell>
                    <TableCell>{term.year}</TableCell>
                    <TableCell>{format(new Date(term.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(term.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {term.is_current ? (
                        <Badge className="bg-green-500">Current</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setCurrentMutation.mutate(term.id)}
                          disabled={setCurrentMutation.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Set Current
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(term)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deleteMutation.mutate(term.id)}
                        disabled={term.is_current}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
