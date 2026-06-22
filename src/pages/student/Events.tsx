import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getStudentSession } from "@/pages/StudentLogin";
import { CalendarCheck, MapPin, Clock, Users, Loader2, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";

export default function StudentEvents() {
  const session = getStudentSession()!;
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});

  const { data: events } = useQuery({
    queryKey: ["student-events", session.tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("school_events")
        .select("id, title, description, event_type, start_date, end_date, event_time, location, capacity, ticket_price, booking_deadline, cover_image_url")
        .eq("tenant_id", session.tenantId)
        .eq("is_published", true)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(50);
      return data || [];
    },
  });

  const { data: myBookings } = useQuery({
    queryKey: ["student-my-bookings", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_bookings")
        .select("id, ticket_count, total_price, status, payment_status, booked_at, event_id, school_events!inner(title, start_date, event_type)")
        .eq("student_id", session.studentId)
        .order("booked_at", { ascending: false });
      return data || [];
    },
  });

  const bookingCounts = (myBookings || []).reduce((acc: Record<string, number>, b: any) => {
    acc[b.event_id] = (acc[b.event_id] || 0) + 1;
    return acc;
  }, {});

  const bookMutation = useMutation({
    mutationFn: async ({ eventId, ticketCount, totalPrice }: { eventId: string; ticketCount: number; totalPrice: number }) => {
      const { error } = await supabase.from("event_bookings").insert({
        event_id: eventId,
        student_id: session.studentId,
        tenant_id: session.tenantId,
        ticket_count: ticketCount,
        total_price: totalPrice,
        status: "confirmed",
        payment_status: totalPrice > 0 ? "unpaid" : "paid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t.messages.toastTitles[42] });
      queryClient.invalidateQueries({ queryKey: ["student-my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["student-events"] });
      setTicketCounts({});
    },
    onError: (err) => toast({ variant: "destructive", title: t.messages.toastTitles[10], description: err.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("event_bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t.messages.toastTitles[8] });
      queryClient.invalidateQueries({ queryKey: ["student-my-bookings"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="h-6 w-6" /> Events
        </h1>
        <p className="text-muted-foreground">Browse and book school events</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Bookings</h2>
        {myBookings?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myBookings.map((b: any) => (
              <Card key={b.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{(b as any).school_events?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date((b as any).school_events?.start_date), "MMM d")}
                      </p>
                    </div>
                    <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Ticket className="h-3 w-3" /> {b.ticket_count} ticket(s)
                  </div>
                  {b.status === "confirmed" && (
                    <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={() => cancelMutation.mutate(b.id)}>
                      {t.common.cancel}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-4 text-center text-sm text-muted-foreground">{t.common.noResults}</CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upcoming Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events?.map((e) => {
            const count = ticketCounts[e.id] || 1;
            const alreadyBooked = (bookingCounts[e.id] || 0) > 0;
            return (
              <Card key={e.id}>
                {e.cover_image_url && (
                  <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                    <img src={e.cover_image_url} alt={e.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{e.title}</h3>
                      <Badge variant="outline" className="capitalize text-xs">{e.event_type}</Badge>
                    </div>
                    {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-3 w-3" />
                      <span>{format(new Date(e.start_date), "MMM d, yyyy")}{e.end_date ? ` - ${format(new Date(e.end_date), "MMM d")}` : ""}</span>
                    </div>
                    {e.event_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{e.event_time.slice(0, 5)}</span>
                      </div>
                    )}
                    {e.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{e.location}</span>
                      </div>
                    )}
                    {e.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>Capacity: {e.capacity}</span>
                      </div>
                    )}
                  </div>
                  {e.ticket_price > 0 && (
                    <p className="text-sm font-medium">{new Intl.NumberFormat().format(e.ticket_price)} UGX per ticket</p>
                  )}
                  {alreadyBooked ? (
                    <Badge variant="secondary" className="w-full justify-center">Already Booked</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none"
                          onClick={() => setTicketCounts({ ...ticketCounts, [e.id]: Math.max(1, count - 1) })}>-</Button>
                        <Input
                          className="h-8 w-12 rounded-none text-center text-sm"
                          value={count}
                          readOnly
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none"
                          onClick={() => setTicketCounts({ ...ticketCounts, [e.id]: count + 1 })}>+</Button>
                      </div>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => bookMutation.mutate({ eventId: e.id, ticketCount: count, totalPrice: e.ticket_price * count })}
                        disabled={bookMutation.isPending}
                      >
                        {bookMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.add}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {(!events || events.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">{t.common.noResults}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
