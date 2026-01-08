import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Link2, Search, CheckCircle, Trash2 } from "lucide-react";

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  tenantId: string;
}

interface Parent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_id: string;
}

interface ParentLink {
  id: string;
  parent_id: string;
  relationship: string;
  is_primary_contact: boolean;
  parents: Parent;
}

const RELATIONSHIPS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'other', label: 'Other' },
];

export function LinkParentDialog({ open, onOpenChange, studentId, studentName, tenantId }: LinkParentDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("existing");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [relationship, setRelationship] = useState("parent");
  
  // New parent form
  const [newParent, setNewParent] = useState({
    full_name: "",
    email: "",
    phone: "",
    relationship: "parent",
  });

  // Fetch existing linked parents for this student
  const { data: linkedParents = [], isLoading: isLoadingLinks } = useQuery({
    queryKey: ['parent-student-links', studentId],
    enabled: !!studentId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_students')
        .select(`
          id,
          parent_id,
          relationship,
          is_primary_contact,
          parents(id, full_name, email, phone, user_id)
        `)
        .eq('student_id', studentId);
      
      if (error) throw error;
      return data as unknown as ParentLink[];
    },
  });

  // Fetch all parents for this tenant
  const { data: allParents = [], isLoading: isLoadingParents } = useQuery({
    queryKey: ['tenant-parents', tenantId],
    enabled: !!tenantId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('id, full_name, email, phone, user_id')
        .eq('tenant_id', tenantId)
        .order('full_name');
      
      if (error) throw error;
      return data as Parent[];
    },
  });

  // Filter out already linked parents
  const linkedParentIds = linkedParents.map(lp => lp.parent_id);
  const availableParents = allParents.filter(p => 
    !linkedParentIds.includes(p.id) &&
    (p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.phone?.includes(searchTerm))
  );

  // Link existing parent mutation
  const linkParentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParentId) throw new Error("Select a parent");
      
      const { error } = await supabase
        .from('parent_students')
        .insert({
          parent_id: selectedParentId,
          student_id: studentId,
          tenant_id: tenantId,
          relationship,
          is_primary_contact: linkedParents.length === 0,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-student-links', studentId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-parents'] });
      toast.success("Parent linked successfully");
      setSelectedParentId(null);
      setRelationship("parent");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link parent");
    },
  });

  // Create new parent and link mutation
  const createAndLinkMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!newParent.full_name || !newParent.email) {
        throw new Error("Name and email are required");
      }

      // Generate a password that meets requirements
      const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
      
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newParent.email,
        password: tempPassword,
        options: {
          data: {
            full_name: newParent.full_name,
            role: 'parent',
            tenant_id: tenantId,
            phone: newParent.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Wait for trigger to create parent record
      await new Promise(resolve => setTimeout(resolve, 500));

      // Find the parent record
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      let parentId: string;

      if (parentError || !parentData) {
        // If trigger didn't create it, create manually
        const { data: manualParent, error: manualError } = await supabase
          .from('parents')
          .insert({
            user_id: authData.user.id,
            tenant_id: tenantId,
            full_name: newParent.full_name,
            email: newParent.email,
            phone: newParent.phone,
          })
          .select('id')
          .single();
        
        if (manualError) throw manualError;
        parentId = manualParent.id;
      } else {
        parentId = parentData.id;
      }

      // Use the security definer function to link parent to student
      const { error: linkError } = await supabase.rpc('link_parent_to_student', {
        p_parent_id: parentId,
        p_student_id: studentId,
        p_tenant_id: tenantId,
        p_relationship: newParent.relationship,
        p_is_primary_contact: linkedParents.length === 0,
      });
      
      if (linkError) throw linkError;
      
      return tempPassword;
    },
    onSuccess: (password) => {
      queryClient.invalidateQueries({ queryKey: ['parent-student-links', studentId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-parents'] });
      toast.success(
        <div className="space-y-2">
          <p className="font-medium">Parent account created!</p>
          <p className="text-sm">Login: <strong>{newParent.email}</strong></p>
          <p className="text-sm">Temporary Password: <strong>{password}</strong></p>
          <p className="text-xs text-muted-foreground">Please share these credentials with the parent.</p>
        </div>,
        { duration: 15000 }
      );
      setNewParent({ full_name: "", email: "", phone: "", relationship: "parent" });
      setActiveTab("existing");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create parent account");
    },
  });

  // Remove link mutation
  const removeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('parent_students')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-student-links', studentId] });
      toast.success("Parent unlinked");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unlink parent");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-500" />
            Link Parents/Guardians
          </DialogTitle>
          <DialogDescription>
            Link parents to <strong>{studentName}</strong> so they can access the parent dashboard
          </DialogDescription>
        </DialogHeader>

        {/* Current Linked Parents */}
        {linkedParents.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currently Linked</Label>
            <div className="space-y-2">
              {linkedParents.map(link => (
                <Card key={link.id} className="bg-green-50 dark:bg-green-950/30 border-green-200">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{link.parents?.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{link.relationship}</span>
                          {link.is_primary_contact && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {link.parents?.email || link.parents?.phone}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeLinkMutation.mutate(link.id)}
                      disabled={removeLinkMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link Existing
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parents by name, email, or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoadingParents ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : availableParents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {searchTerm ? "No matching parents found" : "No available parents to link"}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {availableParents.map(parent => (
                  <Card 
                    key={parent.id}
                    className={`cursor-pointer transition-colors ${
                      selectedParentId === parent.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedParentId(parent.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{parent.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {parent.email || parent.phone || 'No contact info'}
                          </p>
                        </div>
                        {selectedParentId === parent.id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedParentId && (
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(rel => (
                      <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => linkParentMutation.mutate()}
              disabled={!selectedParentId || linkParentMutation.isPending}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Link Selected Parent
            </Button>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label>Full Name *</Label>
                <Input
                  placeholder="Parent/Guardian name"
                  value={newParent.full_name}
                  onChange={e => setNewParent({ ...newParent, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="parent@example.com"
                  value={newParent.email}
                  onChange={e => setNewParent({ ...newParent, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  They'll use this email to log in to the parent portal
                </p>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  placeholder="+256 700 123456"
                  value={newParent.phone}
                  onChange={e => setNewParent({ ...newParent, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Relationship</Label>
                <Select 
                  value={newParent.relationship} 
                  onValueChange={v => setNewParent({ ...newParent, relationship: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(rel => (
                      <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full bg-pink-500 hover:bg-pink-600"
              onClick={() => createAndLinkMutation.mutate()}
              disabled={!newParent.full_name || !newParent.email || createAndLinkMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {createAndLinkMutation.isPending ? "Creating..." : "Create & Link Parent"}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
