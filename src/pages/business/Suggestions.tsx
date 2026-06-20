import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lightbulb, Search, MessageSquare, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Suggestion = Tables<"suggestions">;

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-yellow-500 text-white",
  },
  reviewed: {
    label: "Reviewed",
    icon: <MessageSquare className="h-3 w-3" />,
    className: "bg-blue-500 text-white",
  },
  implemented: {
    label: "Implemented",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-green-500 text-white",
  },
  dismissed: {
    label: "Dismissed",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-gray-500 text-white",
  },
};

const categories = [
  "general",
  "academic",
  "facilities",
  "food",
  "transport",
  "safety",
  "staff",
  "other",
];

export default function Suggestions() {
  const { data: tenantData } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");

  const { data: suggestions = [], isLoading } = useQuery<Suggestion[]>({
    queryKey: ["suggestions", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("tenant_id", tenantData!.tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Suggestion[];
    },
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes: string }) => {
      const { error } = await supabase
        .from("suggestions")
        .update({ status, admin_notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success("Suggestion updated successfully");
      setSelectedSuggestion(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredSuggestions = suggestions.filter((s) => {
    const matchesSearch =
      s.submitter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.submitter_email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.submitter_phone ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: suggestions.length,
    pending: suggestions.filter((s) => s.status === "pending").length,
    reviewed: suggestions.filter((s) => s.status === "reviewed").length,
    implemented: suggestions.filter((s) => s.status === "implemented").length,
  };

  const openDetail = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setAdminNotes(suggestion.admin_notes ?? "");
    setStatusUpdate(suggestion.status);
  };

  const handleUpdate = () => {
    if (!selectedSuggestion) return;
    updateSuggestionMutation.mutate({
      id: selectedSuggestion.id,
      status: statusUpdate,
      admin_notes: adminNotes,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suggestions</h1>
          <p className="text-muted-foreground">View and manage public suggestions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Lightbulb className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.reviewed}</p>
                <p className="text-sm text-muted-foreground">Reviewed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.implemented}</p>
                <p className="text-sm text-muted-foreground">Implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search by name, email, phone or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Date</th>
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Name</th>
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Email / Phone</th>
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Category</th>
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Message</th>
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Status</th>
                <th className="text-left font-medium text-muted-foreground p-3 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredSuggestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No suggestions found
                  </td>
                </tr>
              ) : (
                filteredSuggestions.map((suggestion) => {
                  const cfg = statusConfig[suggestion.status] ?? statusConfig.pending;
                  return (
                    <tr
                      key={suggestion.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => openDetail(suggestion)}
                    >
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(suggestion.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium">
                        {suggestion.submitter_name}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {suggestion.submitter_email ?? suggestion.submitter_phone ?? "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="outline" className="capitalize">
                          {suggestion.category}
                        </Badge>
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <p className="truncate text-muted-foreground">{suggestion.message}</p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge className={cfg.className}>
                          <span className="flex items-center gap-1">
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Search className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Suggestion from {suggestion.submitter_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Name</p>
                                  <p className="font-medium">{suggestion.submitter_name}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Date</p>
                                  <p className="font-medium">
                                    {format(new Date(suggestion.created_at), "MMMM d, yyyy h:mm a")}
                                  </p>
                                </div>
                                {suggestion.submitter_email && (
                                  <div>
                                    <p className="text-muted-foreground">Email</p>
                                    <p className="font-medium">{suggestion.submitter_email}</p>
                                  </div>
                                )}
                                {suggestion.submitter_phone && (
                                  <div>
                                    <p className="text-muted-foreground">Phone</p>
                                    <p className="font-medium">{suggestion.submitter_phone}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-muted-foreground">Category</p>
                                  <Badge variant="outline" className="capitalize mt-1">
                                    {suggestion.category}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Status</p>
                                  <Badge className={cfg.className + " mt-1"}>
                                    <span className="flex items-center gap-1">
                                      {cfg.icon}
                                      {cfg.label}
                                    </span>
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Message</p>
                                <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                  {suggestion.message}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSuggestion} onOpenChange={(open) => { if (!open) setSelectedSuggestion(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Manage Suggestion — {selectedSuggestion?.submitter_name}
            </DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedSuggestion.submitter_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedSuggestion.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {selectedSuggestion.submitter_email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedSuggestion.submitter_email}</p>
                  </div>
                )}
                {selectedSuggestion.submitter_phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedSuggestion.submitter_phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <Badge variant="outline" className="capitalize mt-1">
                    {selectedSuggestion.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Status</p>
                  <Badge className={(statusConfig[selectedSuggestion.status] ?? statusConfig.pending).className + " mt-1"}>
                    <span className="flex items-center gap-1">
                      {(statusConfig[selectedSuggestion.status] ?? statusConfig.pending).icon}
                      {(statusConfig[selectedSuggestion.status] ?? statusConfig.pending).label}
                    </span>
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Message</p>
                <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                  {selectedSuggestion.message}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="implemented">Implemented</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this suggestion..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedSuggestion(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateSuggestionMutation.isPending}
                >
                  {updateSuggestionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
