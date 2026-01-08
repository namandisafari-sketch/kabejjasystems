import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ClipboardList,
  UserPlus,
  LogIn,
  LogOut,
  Clock,
  Users,
  Search,
  Phone,
  CreditCard,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Visitor {
  id: string;
  visitor_name: string;
  phone: string | null;
  id_number: string | null;
  purpose: string;
  visiting_who: string | null;
  student_id: string | null;
  check_in_time: string;
  check_out_time: string | null;
  badge_number: string | null;
  notes: string | null;
  students?: { full_name: string; admission_number: string } | null;
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

export default function VisitorRegister() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    visitor_name: "",
    phone: "",
    id_number: "",
    purpose: "",
    visiting_who: "",
    badge_number: "",
    notes: "",
  });

  // Fetch today's visitors
  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["visitors", tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("visitor_register")
        .select(`
          *,
          students (full_name, admission_number)
        `)
        .eq("tenant_id", tenantId)
        .gte("check_in_time", today.toISOString())
        .order("check_in_time", { ascending: false });

      if (error) throw error;
      return data as Visitor[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("visitor_register").insert({
        tenant_id: tenantId,
        visitor_name: formData.visitor_name,
        phone: formData.phone || null,
        id_number: formData.id_number || null,
        purpose: formData.purpose,
        visiting_who: formData.visiting_who || null,
        badge_number: formData.badge_number || null,
        notes: formData.notes || null,
        checked_in_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor checked in successfully");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      setIsDialogOpen(false);
      setFormData({
        visitor_name: "",
        phone: "",
        id_number: "",
        purpose: "",
        visiting_who: "",
        badge_number: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Check-out mutation
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
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
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

  // Filter visitors
  const filteredVisitors = visitors.filter(
    (v) =>
      v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visiting_who?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const currentlyIn = visitors.filter((v) => !v.check_out_time).length;
  const checkedOut = visitors.filter((v) => v.check_out_time).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Visitor Register
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <UserPlus className="h-5 w-5 mr-2" />
                Register Visitor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Visitor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="visitor_name">Visitor Name *</Label>
                  <Input
                    id="visitor_name"
                    value={formData.visitor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, visitor_name: e.target.value })
                    }
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_number">ID Number</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) =>
                        setFormData({ ...formData, id_number: e.target.value })
                      }
                      placeholder="National ID"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose of Visit *</Label>
                  <Select
                    value={formData.purpose}
                    onValueChange={(value) =>
                      setFormData({ ...formData, purpose: value })
                    }
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="visiting_who">Visiting Who</Label>
                  <Input
                    id="visiting_who"
                    value={formData.visiting_who}
                    onChange={(e) =>
                      setFormData({ ...formData, visiting_who: e.target.value })
                    }
                    placeholder="Name of person/student being visited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badge_number">Badge Number</Label>
                  <Input
                    id="badge_number"
                    value={formData.badge_number}
                    onChange={(e) =>
                      setFormData({ ...formData, badge_number: e.target.value })
                    }
                    placeholder="Visitor badge #"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={checkInMutation.isPending}
                >
                  {checkInMutation.isPending ? "Registering..." : "Check In Visitor"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Today</p>
                  <p className="text-2xl font-bold">{visitors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <LogIn className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currently In</p>
                  <p className="text-2xl font-bold">{currentlyIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <LogOut className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checked Out</p>
                  <p className="text-2xl font-bold">{checkedOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visitor List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Today's Visitors</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time In</TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Visiting</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredVisitors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No visitors registered today
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(visitor.check_in_time), "h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{visitor.visitor_name}</p>
                          {visitor.id_number && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {visitor.id_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {visitor.phone && (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {visitor.phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{visitor.purpose}</Badge>
                      </TableCell>
                      <TableCell>{visitor.visiting_who || "-"}</TableCell>
                      <TableCell>
                        {visitor.badge_number ? (
                          <Badge variant="secondary">{visitor.badge_number}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {visitor.check_out_time ? (
                          <div>
                            <Badge variant="outline" className="text-orange-600">
                              Left
                            </Badge>
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
