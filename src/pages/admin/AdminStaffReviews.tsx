import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Search, Shield, Monitor, Globe, Smartphone, Fingerprint, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/i18n";

type StaffReview = Database["public"]["Tables"]["staff_reviews"]["Row"] & {
  tenants?: { name: string; business_code: string } | null;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function AdminStaffReviews() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState<StaffReview | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-staff-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_reviews")
        .select(`
          *,
          tenants:tenant_id (name, business_code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as unknown as StaffReview[];
    },
  });

  const filtered = reviews?.filter((r) => {
    const matchSearch =
      searchTerm === "" ||
      r.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.review?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.school_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tenants as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchRating = ratingFilter === "all" || r.rating === parseInt(ratingFilter);
    return matchSearch && matchStatus && matchRating;
  });

  const stats = {
    total: reviews?.length || 0,
    pending: reviews?.filter((r) => r.status === "pending").length || 0,
    approved: reviews?.filter((r) => r.status === "approved").length || 0,
    avgRating: reviews?.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "0.0",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-6 w-6" />
          {t.navigation.adminSidebarItems.staffReviews}
        </h1>
        <p className="text-muted-foreground">Monitor staff reviews across all schools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold">{stats.avgRating}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={n.toString()}>{n} Star{n > 1 ? "s" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Anonymous</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reviews found</TableCell>
                </TableRow>
              ) : (
                filtered?.map((r) => {
                  const cfg = statusConfig[r.status] || statusConfig.pending;
                  const tenant = r.tenants as any;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedReview(r)}
                    >
                      <TableCell className="font-medium">{tenant?.name || r.school_code}</TableCell>
                      <TableCell>{r.staff_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{r.rating}</span>
                          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.student_name}</TableCell>
                      <TableCell>
                        {r.is_anonymous ? (
                          <Badge variant="outline" className="text-xs">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Monitor className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Review Details
            </DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">School</label>
                  <p>{(selectedReview.tenants as any)?.name || selectedReview.school_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">School Code</label>
                  <p>{selectedReview.school_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Staff Name</label>
                  <p className="font-medium">{selectedReview.staff_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rating</label>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-lg">{selectedReview.rating}</span>
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="text-muted-foreground">/ 5</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                  <p>{selectedReview.student_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Anonymous</label>
                  <p>{selectedReview.is_anonymous ? "Yes" : "No"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={statusConfig[selectedReview.status]?.variant || "outline"}>
                    {statusConfig[selectedReview.status]?.label || selectedReview.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verified</label>
                  <p>{selectedReview.is_verified ? "Yes" : "No"}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Review</label>
                <p className="mt-1 p-3 bg-muted rounded-md">{selectedReview.review}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Device Fingerprint
                </h4>
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">IP Address</p>
                      <p className="text-sm font-mono">{selectedReview.ip_address || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Language</p>
                      <p className="text-sm font-mono">{selectedReview.browser_language || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div className="overflow-hidden">
                      <p className="text-xs text-muted-foreground">User Agent</p>
                      <p className="text-sm font-mono truncate">{selectedReview.user_agent || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Screen Resolution</p>
                      <p className="text-sm font-mono">{selectedReview.screen_resolution || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fingerprint Hash</p>
                      <p className="text-sm font-mono truncate max-w-[200px]">
                        {selectedReview.device_fingerprint || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Submitted {format(new Date(selectedReview.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
