import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  UserPlus,
  LogIn,
  LogOut,
  Users,
  Search,
  Phone,
  ClipboardList,
} from "lucide-react";
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

interface VisitorRecord {
  id: string;
  visitor_name: string;
  phone: string | null;
  purpose: string;
  visiting_who: string | null;
  check_in_time: string;
  check_out_time: string | null;
  badge_number: string | null;
}

const visitPurposes = [
  "Parent Visit",
  "Official Meeting",
  "Delivery",
  "Maintenance/Repair",
  "Interview",
  "Student Pickup",
  "Emergency",
  "Other",
];

interface GateVisitorCheckinProps {
  tenantId: string;
}

export default function GateVisitorCheckin({ tenantId }: GateVisitorCheckinProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    visitor_name: "",
    phone: "",
    purpose: "",
    visiting_who: "",
    notes: "",
  });

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["gate-visitors", tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("visitor_register")
        .select("id, visitor_name, phone, purpose, visiting_who, check_in_time, check_out_time, badge_number")
        .eq("tenant_id", tenantId)
        .gte("check_in_time", today.toISOString())
        .order("check_in_time", { ascending: false });

      if (error) throw error;
      return data as VisitorRecord[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("visitor_register").insert({
        tenant_id: tenantId,
        visitor_name: formData.visitor_name,
        phone: formData.phone || null,
        purpose: formData.purpose,
        visiting_who: formData.visiting_who || null,
        notes: formData.notes || null,
        checked_in_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor checked in successfully");
      queryClient.invalidateQueries({ queryKey: ["gate-visitors"] });
      setFormData({ visitor_name: "", phone: "", purpose: "", visiting_who: "", notes: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (visitorId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("visitor_register")
        .update({
          check_out_time: new Date().toISOString(),
          checked_out_by: user?.id,
        })
        .eq("id", visitorId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor checked out");
      queryClient.invalidateQueries({ queryKey: ["gate-visitors"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.visitor_name || !formData.purpose) {
      toast.error("Please fill in required fields");
      return;
    }
    checkInMutation.mutate();
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visiting_who?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentlyIn = visitors.filter((v) => !v.check_out_time).length;
  const checkedOut = visitors.filter((v) => v.check_out_time).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Today</p>
                <p className="text-lg md:text-2xl font-bold">{visitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <LogIn className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">In Premises</p>
                <p className="text-lg md:text-2xl font-bold">{currentlyIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <LogOut className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Checked Out</p>
                <p className="text-lg md:text-2xl font-bold">{checkedOut}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
            Quick Visitor Check-In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor_name">Visitor Name *</Label>
              <Input
                id="visitor_name"
                value={formData.visitor_name}
                onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                placeholder="Full name"
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit *</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {visitPurposes.map((purpose) => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visiting_who">Visiting Who</Label>
              <Input
                id="visiting_who"
                value={formData.visiting_who}
                onChange={(e) => setFormData({ ...formData, visiting_who: e.target.value })}
                placeholder="Name of person they're visiting"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? "Registering..." : "Check In Visitor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Today's Visitors
            </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search visitors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredVisitors.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">No visitors today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Visiting</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(visitor.check_in_time), "h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{visitor.visitor_name}</p>
                          {visitor.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {visitor.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{visitor.purpose}</Badge>
                      </TableCell>
                      <TableCell>{visitor.visiting_who || "-"}</TableCell>
                      <TableCell>
                        {visitor.check_out_time ? (
                          <div>
                            <Badge variant="outline" className="text-orange-600">Left</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(visitor.check_out_time), "h:mm a")}
                            </p>
                          </div>
                        ) : (
                          <Badge className="bg-green-600">In Premises</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!visitor.check_out_time && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkOutMutation.mutate(visitor.id)}
                            disabled={checkOutMutation.isPending}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Check Out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
