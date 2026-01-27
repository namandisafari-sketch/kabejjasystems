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
import { Plus, Loader2, Bed, DoorOpen, DoorClosed } from "lucide-react";
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

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Executive", "Family"];
const ROOM_STATUS = ["available", "occupied", "maintenance", "reserved"];

export default function HotelRooms() {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    room_number: "",
    room_type: "Standard",
    capacity: "2",
    price_per_night: "",
    floor: "",
  });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['hotel_rooms', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('hotel_rooms')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('room_number');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from('hotel_rooms').insert({
        tenant_id: tenantId,
        room_number: formData.room_number,
        room_type: formData.room_type,
        capacity: parseInt(formData.capacity),
        price_per_night: parseFloat(formData.price_per_night),
        floor: formData.floor || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Room added" });
      setOpen(false);
      setFormData({
        room_number: "",
        room_type: "Standard",
        capacity: "2",
        price_per_night: "",
        floor: "",
      });
      queryClient.invalidateQueries({ queryKey: ['hotel_rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('hotel_rooms')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel_rooms'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'reserved': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const availableRooms = rooms?.filter(r => r.status === 'available').length || 0;
  const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;

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
          <h1 className="text-2xl font-bold">Hotel Rooms</h1>
          <p className="text-muted-foreground">Manage your rooms</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Room Number *</Label>
                  <Input
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="101"
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="1st Floor"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Room Type</Label>
                  <Select
                    value={formData.room_type}
                    onValueChange={(value) => setFormData({ ...formData, room_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    min="1"
                  />
                </div>
              </div>
              <div>
                <Label>Price per Night (UGX) *</Label>
                <Input
                  type="number"
                  value={formData.price_per_night}
                  onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                  placeholder="100000"
                />
              </div>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!formData.room_number || !formData.price_per_night || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <DoorOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableRooms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <DoorClosed className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{occupiedRooms}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms?.map((room) => (
          <Card key={room.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${getStatusColor(room.status)}`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Room {room.room_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">{room.room_type}</p>
                </div>
                <Badge variant="outline" className="capitalize">{room.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity</span>
                <span>{room.capacity} guests</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price/Night</span>
                <span className="font-medium">{Number(room.price_per_night).toLocaleString()} UGX</span>
              </div>
              {room.floor && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Floor</span>
                  <span>{room.floor}</span>
                </div>
              )}
              <Select
                value={room.status}
                onValueChange={(value) => updateStatus.mutate({ id: room.id, status: value })}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_STATUS.map(status => (
                    <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
        {(!rooms || rooms.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12 text-muted-foreground">
              No rooms added yet. Click "Add Room" to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
