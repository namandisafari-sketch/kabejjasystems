import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Copy, Link, Clock, Check, X, Eye, Trash2 } from "lucide-react";
import { format, addHours, isPast } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface AdmissionLink {
  id: string;
  link_code: string;
  payment_code: string;
  expires_at: string;
  max_registrations: number;
  registrations_used: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export default function AdmissionLinks() {
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [validityHours, setValidityHours] = useState(24);
  const [createdLink, setCreatedLink] = useState<{ url: string; code: string } | null>(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ["admission-links", tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from("admission_links")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdmissionLink[];
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: settings } = useQuery({
    queryKey: ["admission-settings", tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;
      const { data } = await supabase
        .from("admission_settings")
        .select("link_validity_hours")
        .eq("tenant_id", tenant.tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  // Generate a random payment code
  const generatePaymentCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PAY-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.tenantId) throw new Error("No tenant");
      
      const expiresAt = addHours(new Date(), validityHours);
      const autoPaymentCode = generatePaymentCode();
      
      const { data, error } = await supabase
        .from("admission_links")
        .insert({
          tenant_id: tenant.tenantId,
          payment_code: autoPaymentCode,
          expires_at: expiresAt.toISOString(),
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admission-links", tenant?.tenantId] });
      const url = `${window.location.origin}/public/admission/${data.link_code}`;
      setCreatedLink({ url, code: data.payment_code });
      setNotes("");
      toast({ title: "Admission link created", description: "Share this link with the parent along with the payment code." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admission_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-links", tenant?.tenantId] });
      toast({ title: "Link deleted" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const getLinkStatus = (link: AdmissionLink) => {
    if (!link.is_active) return { label: "Used", variant: "secondary" as const };
    if (isPast(new Date(link.expires_at))) return { label: "Expired", variant: "destructive" as const };
    return { label: "Active", variant: "default" as const };
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admission Links</h1>
          <p className="text-muted-foreground">
            Generate one-time links for parents to complete online admission
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setCreatedLink(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Admission Link</DialogTitle>
              <DialogDescription>
                Create a one-time link for a parent who has paid admission fees
              </DialogDescription>
            </DialogHeader>

            {createdLink ? (
              <div className="space-y-4 py-4">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Admission Link</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-background rounded px-2 py-1 break-all">
                        {createdLink.url}
                      </code>
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdLink.url, "Link")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Payment Code (give to parent)</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-lg font-mono font-bold bg-background rounded px-2 py-1">
                        {createdLink.code}
                      </code>
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdLink.code, "Payment code")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share both the link and the payment code with the parent. They will need both to complete the registration.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="validity">Link Validity (hours)</Label>
                  <Input
                    id="validity"
                    type="number"
                    min={1}
                    max={168}
                    value={validityHours}
                    onChange={(e) => setValidityHours(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    A unique payment code will be auto-generated when you create the link
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Parent name, child name, etc."
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              {createdLink ? (
                <Button onClick={() => { setIsCreateOpen(false); setCreatedLink(null); }}>
                  Done
                </Button>
              ) : (
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Link & Code
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Generated Links
          </CardTitle>
          <CardDescription>
            One-time admission links for remote registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {links && links.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const status = getLinkStatus(link);
                  const linkUrl = `${window.location.origin}/public/admission/${link.link_code}`;
                  
                  return (
                    <TableRow key={link.id}>
                      <TableCell className="font-mono font-medium">
                        {link.payment_code}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(link.expires_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        {link.registrations_used} / {link.max_registrations}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {link.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(linkUrl, "Link")}
                            title="Copy link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(link.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No admission links generated yet</p>
              <p className="text-sm">Generate a link when a parent pays admission fees</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
