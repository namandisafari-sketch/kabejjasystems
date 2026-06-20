import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getStudentSession } from "@/pages/StudentLogin";
import { Lightbulb, Send, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CATEGORIES = ["general", "academic", "facilities", "safety", "food", "transport", "other"];

export default function StudentSuggestions() {
  const session = getStudentSession()!;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  const { data: suggestions } = useQuery({
    queryKey: ["student-suggestions", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("suggestions")
        .select("id, category, message, status, admin_notes, created_at")
        .eq("tenant_id", session.tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suggestions").insert({
        tenant_id: session.tenantId,
        submitter_name: session.fullName,
        submitter_email: null,
        submitter_phone: null,
        category,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Suggestion submitted" });
      setCategory("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["student-suggestions"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "Pending", variant: "outline" },
      reviewed: { label: "Reviewed", variant: "secondary" },
      implemented: { label: "Implemented", variant: "default" },
      dismissed: { label: "Dismissed", variant: "destructive" },
    };
    const c = map[status] || map.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6" /> Suggestions
        </h1>
        <p className="text-muted-foreground">Share your ideas to improve the school</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submit a Suggestion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Your Suggestion</Label>
            <Textarea
              placeholder="Describe your suggestion..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!category || !message || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Submit
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">My Suggestions</h2>
        {suggestions?.length ? (
          suggestions.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">{s.category}</Badge>
                      {statusBadge(s.status)}
                    </div>
                    <p className="text-sm">{s.message}</p>
                    {s.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Response:</span> {s.admin_notes}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(s.created_at), "MMM d")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No suggestions yet. Submit your first one above!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
