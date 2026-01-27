import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, CalendarDays, Users, DollarSign } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";

export default function RoomBookings() {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    room_id: "",
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_id_number: "",
    check_in_date: format(new Date(), 'yyyy-MM-dd'),
    check_out_date: "",
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['room_bookings', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('room_bookings')
        .select('*, hotel_rooms(room_number, room_type, price_per_night)')
        .eq('tenant_id', tenantId)
        .order('check_in_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: availableRooms } = useQuery({
    queryKey: ['available_rooms', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('hotel_rooms')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'available')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const room = availableRooms?.find(r => r.id === formData.room_id);
      if (!room) throw new Error("Room not found");

      const nights = differenceInDays(new Date(formData.check_out_date), new Date(formData.check_in_date));
      const total = nights * Number(room.price_per_night);

      const { error } = await supabase.from('room_bookings').insert({
        tenant_id: tenantId,
        room_id: formData.room_id,
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone || null,
        guest_email: formData.guest_email || null,
        guest_id_number: formData.guest_id_number || null,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        total_amount: total,
        status: 'reserved',
      });
      if (error) throw error;

      // Update room status
      await supabase.from('hotel_rooms').update({ status: 'reserved' }).eq('id', formData.room_id);
    },
    onSuccess: () => {
      toast({ title: "Booking created" });
      setOpen(false);
      setFormData({
        room_id: "",
        guest_name: "",
        guest_phone: "",
        guest_email: "",
        guest_id_number: "",
        check_in_date: format(new Date(), 'yyyy-MM-dd'),
        check_out_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ['room_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['available_rooms'] });
      queryClient.invalidateQueries({ queryKey: ['hotel_rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, roomId }: { id: string; status: string; roomId: string }) => {
      const { error } = await supabase
        .from('room_bookings')
        .update({ 
          status,
          actual_check_in: status === 'checked_in' ? new Date().toISOString() : undefined,
          actual_check_out: status === 'checked_out' ? new Date().toISOString() : undefined,
        })
        .eq('id', id);
      if (error) throw error;

      // Update room status
      if (status === 'checked_in') {
        await supabase.from('hotel_rooms').update({ status: 'occupied' }).eq('id', roomId);
      } else if (status === 'checked_out' || status === 'cancelled') {
        await supabase.from('hotel_rooms').update({ status: 'available' }).eq('id', roomId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hotel_rooms'] });
      queryClient.invalidateQueries({ queryKey: ['available_rooms'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reserved': return <Badge variant="secondary">Reserved</Badge>;
      case 'checked_in': return <Badge className="bg-green-500">Checked In</Badge>;
      case 'checked_out': return <Badge variant="outline">Checked Out</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const todayBookings = bookings?.filter(b => 
    format(new Date(b.check_in_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length || 0;

  const activeGuests = bookings?.filter(b => b.status === 'checked_in').length || 0;
  const totalRevenue = bookings?.filter(b => b.status === 'checked_out')
    .reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Room Bookings</h1>
          <p className="text-muted-foreground">Manage reservations and check-ins</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Room *</Label>
                <Select
                  value={formData.room_id}
                  onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms?.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type} ({Number(room.price_per_night).toLocaleString()} UGX/night)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guest Name *</Label>
                <Input
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    placeholder="+256..."
                  />
                </div>
                <div>
                  <Label>ID Number</Label>
                  <Input
                    value={formData.guest_id_number}
                    onChange={(e) => setFormData({ ...formData, guest_id_number: e.target.value })}
                    placeholder="NIN/Passport"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check In *</Label>
                  <Input
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Check Out *</Label>
                  <Input
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    min={formData.check_in_date}
                  />
                </div>
              </div>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!formData.room_id || !formData.guest_name || !formData.check_out_date || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGuests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} UGX</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    Room {booking.hotel_rooms?.room_number}
                  </TableCell>
                  <TableCell>
                    <div>{booking.guest_name}</div>
                    <div className="text-sm text-muted-foreground">{booking.guest_phone}</div>
                  </TableCell>
                  <TableCell>{format(new Date(booking.check_in_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{format(new Date(booking.check_out_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{Number(booking.total_amount).toLocaleString()} UGX</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    {booking.status === 'reserved' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ 
                          id: booking.id, 
                          status: 'checked_in',
                          roomId: booking.room_id 
                        })}
                      >
                        Check In
                      </Button>
                    )}
                    {booking.status === 'checked_in' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ 
                          id: booking.id, 
                          status: 'checked_out',
                          roomId: booking.room_id 
                        })}
                      >
                        Check Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!bookings || bookings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bookings yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
