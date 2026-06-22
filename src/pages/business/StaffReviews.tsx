import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { Star, Search, ThumbsUp, ThumbsDown, Clock, Loader2, Monitor, Smartphone, Globe, Fingerprint } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type StaffReview = Tables<"staff_reviews">;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const ratingOptions = [1, 2, 3, 4, 5];

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

export default function StaffReviews() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<StaffReview | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editVerified, setEditVerified] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: reviews = [], isLoading } = useQuery<StaffReview[]>({
    queryKey: ["staff-reviews", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("staff_reviews")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StaffReview[];
    },
    enabled: !!tenantId,
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, status, is_verified }: { id: string; status: string; is_verified: boolean }) => {
      const { error } = await supabase
        .from("staff_reviews")
        .update({ status, is_verified })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-reviews"] });
      toast.success("Review updated successfully");
      setIsSaving(false);
      setSelectedReview(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const openDetailDialog = (review: StaffReview) => {
    setSelectedReview(review);
    setEditStatus(review.status);
    setEditVerified(review.is_verified ?? false);
  };

  const handleSave = () => {
    if (!selectedReview) return;
    setIsSaving(true);
    updateReviewMutation.mutate({
      id: selectedReview.id,
      status: editStatus,
      is_verified: editVerified,
    });
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.staff_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === "all" || r.rating === Number(ratingFilter);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesRating && matchesStatus;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    avgRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Reviews</h1>
        <p className="text-muted-foreground">Manage public reviews submitted for staff members</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Star className="h-5 w-5 text-muted-foreground" />
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
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search by student or staff name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            {ratingOptions.map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} Star{r > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Staff</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rating</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No reviews found
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => openDetailDialog(review)}
                  >
                    <td className="p-3 text-sm">
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-sm font-medium">{review.student_name}</td>
                    <td className="p-3 text-sm">{review.staff_name}</td>
                    <td className="p-3">
                      <StarRating rating={review.rating} />
                    </td>
                    <td className="p-3">
                      <Badge variant={statusConfig[review.status]?.variant ?? "outline"}>
                        {statusConfig[review.status]?.label ?? review.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetailDialog(review); }}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selectedReview} onOpenChange={(open) => { if (!open) setSelectedReview(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedReview.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staff Member</p>
                  <p className="font-medium">{selectedReview.staff_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedReview.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <StarRating rating={selectedReview.rating} size={20} />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Review</p>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                  {selectedReview.review || "No review text provided."}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={statusConfig[selectedReview.status]?.variant ?? "outline"}>
                    {statusConfig[selectedReview.status]?.label ?? selectedReview.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Verified</p>
                  <Badge variant={selectedReview.is_verified ? "default" : "secondary"}>
                    {selectedReview.is_verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                {selectedReview.is_anonymous && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Anonymous</p>
                    <Badge variant="outline">Yes</Badge>
                  </div>
                )}
              </div>

              <div>
                <details className="group" open>
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    <Fingerprint className="h-4 w-4" />
                    Device Information
                  </summary>
                  <div className="mt-3 space-y-3 pl-6">
                    {selectedReview.ip_address && (
                      <div>
                        <p className="text-xs text-muted-foreground">IP Address</p>
                        <p className="text-sm">{selectedReview.ip_address}</p>
                      </div>
                    )}
                    {selectedReview.user_agent && (
                      <div>
                        <p className="text-xs text-muted-foreground">User Agent</p>
                        <p className="text-xs font-mono break-all bg-muted p-2 rounded mt-1">
                          {selectedReview.user_agent}
                        </p>
                      </div>
                    )}
                    {selectedReview.browser_language && (
                      <div>
                        <p className="text-xs text-muted-foreground">Browser Language</p>
                        <p className="text-sm">{selectedReview.browser_language}</p>
                      </div>
                    )}
                    {selectedReview.screen_resolution && (
                      <div>
                        <p className="text-xs text-muted-foreground">Screen Resolution</p>
                        <p className="text-sm">{selectedReview.screen_resolution}</p>
                      </div>
                    )}
                    {selectedReview.device_fingerprint && (
                      <div>
                        <p className="text-xs text-muted-foreground">Device Fingerprint</p>
                        <p className="text-xs font-mono break-all bg-muted p-2 rounded mt-1">
                          {selectedReview.device_fingerprint}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Anonymous Submission</p>
                      <p className="text-sm">{selectedReview.is_anonymous ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </details>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="font-medium">Moderation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <Select value={editVerified ? "true" : "false"} onValueChange={(v) => setEditVerified(v === "true")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Verified</SelectItem>
                        <SelectItem value="false">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedReview(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
