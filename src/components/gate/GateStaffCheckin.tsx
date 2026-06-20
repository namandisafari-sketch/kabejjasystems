import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  UserCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  role: string;
}

interface StaffCheckinRecord {
  id: string;
  employee_id: string | null;
  person_name: string | null;
  check_type: string;
  checked_at: string;
  is_late: boolean;
  notes: string | null;
}

function StaffCheckinCard({ checkin }: { checkin: StaffCheckinRecord }) {
  return (
    <div className={`p-3 rounded-lg border ${
      checkin.check_type === "arrival" ? "bg-success/10 border-success/30" : "bg-muted border-border"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{checkin.person_name || "Staff"}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-mono">{format(new Date(checkin.checked_at), "h:mm a")}</p>
          <Badge variant={checkin.check_type === "arrival" ? "default" : "secondary"} className="text-2xs mt-1">
            {checkin.check_type === "arrival" ? "In" : "Out"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

interface GateStaffCheckinProps {
  tenantId: string;
}

export default function GateStaffCheckin({ tenantId }: GateStaffCheckinProps) {
  const queryClient = useQueryClient();
  const [checkType, setCheckType] = useState<"arrival" | "departure">("arrival");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const selectContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectContainerRef.current && !selectContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["employees-search", tenantId, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const search = `%${debouncedSearch}%`;
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, phone, department, role")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or(`full_name.ilike.${search},email.ilike.${search},phone.ilike.${search},department.ilike.${search}`)
        .order("full_name")
        .limit(10);

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!tenantId && debouncedSearch.length >= 2,
  });

  const { data: todayCheckins = [] } = useQuery({
    queryKey: ["staff-gate-checkins", tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("gate_checkins")
        .select("id, employee_id, person_name, check_type, checked_at, is_late, notes")
        .eq("tenant_id", tenantId)
        .eq("person_type", "staff")
        .gte("checked_at", today.toISOString())
        .order("checked_at", { ascending: false });

      if (error) throw error;
      return (data || []) as StaffCheckinRecord[];
    },
    enabled: !!tenantId,
    refetchInterval: 5000,
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) throw new Error("No employee selected");

      const { data: userData } = await supabase.auth.getUser();

      if (checkType === "arrival") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: existing } = await supabase
          .from("gate_checkins")
          .select("id")
          .eq("employee_id", selectedEmployee.id)
          .eq("check_type", "arrival")
          .eq("person_type", "staff")
          .gte("checked_at", today.toISOString())
          .maybeSingle();

        if (existing) throw new Error("Staff member already checked in today");
      }

      const { error } = await supabase
        .from("gate_checkins")
        .insert({
          tenant_id: tenantId,
          person_type: "staff",
          employee_id: selectedEmployee.id,
          person_name: selectedEmployee.full_name,
          check_type: checkType,
          checked_by: userData.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      if (!selectedEmployee) return;
      toast.success(
        `${selectedEmployee.full_name} checked ${checkType === "arrival" ? "in" : "out"}`
      );
      queryClient.invalidateQueries({ queryKey: ["staff-gate-checkins"] });
      setSelectedEmployee(null);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const arrivals = todayCheckins.filter((c) => c.check_type === "arrival");
  const departures = todayCheckins.filter((c) => c.check_type === "departure");
  const currentlyIn = arrivals.length - departures.length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-success/20 rounded-full">
                <ArrowDownCircle className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Arrivals</p>
                <p className="text-lg md:text-2xl font-bold">{arrivals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-warning/20 rounded-full">
                <ArrowUpCircle className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Departures</p>
                <p className="text-lg md:text-2xl font-bold">{departures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-primary/20 rounded-full">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">On Premises</p>
                <p className="text-lg md:text-2xl font-bold">{Math.max(0, currentlyIn)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <UserCheck className="h-4 w-4 md:h-5 md:w-5" />
            Staff Check-In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={checkType} onValueChange={(v) => setCheckType(v as "arrival" | "departure")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arrival">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-green-500" />
                    Arrival
                  </div>
                </SelectItem>
                <SelectItem value="departure">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                    Departure
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div ref={selectContainerRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedEmployee(null);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search staff by name, email, phone, or department..."
                className="pl-9 h-12"
                autoComplete="off"
              />
            </div>

            {selectedEmployee && (
              <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{selectedEmployee.full_name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {selectedEmployee.department && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedEmployee.department}
                        </span>
                      )}
                      {selectedEmployee.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedEmployee.phone}
                        </span>
                      )}
                      {selectedEmployee.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedEmployee.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setSearchQuery("");
                    }}
                    className="shrink-0"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}

            {isDropdownOpen && !selectedEmployee && searchQuery.length >= 2 && (
              <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-60 overflow-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No staff found</div>
                ) : (
                  searchResults.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-accent transition-colors border-b last:border-0"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setSearchQuery(emp.full_name);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <p className="font-medium text-sm">{emp.full_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {emp.department && (
                          <span className="text-xs text-muted-foreground">{emp.department}</span>
                        )}
                        {emp.role && emp.role !== "staff" && (
                          <span className="text-xs text-muted-foreground capitalize">{emp.role}</span>
                        )}
                        {emp.phone && (
                          <span className="text-xs text-muted-foreground">{emp.phone}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full h-12"
            onClick={() => checkinMutation.mutate()}
            disabled={!selectedEmployee || checkinMutation.isPending}
          >
            {checkinMutation.isPending ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <UserCheck className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                {selectedEmployee
                  ? `Check ${checkType === "arrival" ? "In" : "Out"} ${selectedEmployee.full_name}`
                  : "Select a staff member"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Users className="h-4 w-4" />
            Today's Staff Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayCheckins.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">No staff check-ins yet today</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {todayCheckins.slice(0, 20).map((checkin) => (
                <StaffCheckinCard key={checkin.id} checkin={checkin} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
