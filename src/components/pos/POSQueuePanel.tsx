import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Bell, CheckCircle, Clock, Loader2 } from "lucide-react";

interface POSQueuePanelProps {
  tenantId: string;
  onServeCustomer: (items: any[], customerName: string) => void;
}

export function POSQueuePanel({ tenantId, onServeCustomer }: POSQueuePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCustomerName, setNewCustomerName] = useState("");

  const { data: queueItems, isLoading } = useQuery({
    queryKey: ["pos-queue", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_queue")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["waiting", "serving"])
        .order("queue_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("pos-queue-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_queue",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pos-queue", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const addToQueueMutation = useMutation({
    mutationFn: async (customerName: string) => {
      // Get next queue number
      const { data: lastQueue } = await supabase
        .from("pos_queue")
        .select("queue_number")
        .eq("tenant_id", tenantId)
        .gte("created_at", new Date().toISOString().split("T")[0])
        .order("queue_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (lastQueue?.queue_number || 0) + 1;

      const { data, error } = await supabase
        .from("pos_queue")
        .insert({
          tenant_id: tenantId,
          queue_number: nextNumber,
          customer_name: customerName || `Customer ${nextNumber}`,
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `Added #${data.queue_number} to queue` });
      setNewCustomerName("");
      queryClient.invalidateQueries({ queryKey: ["pos-queue"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const callNextMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const { data, error } = await supabase
        .from("pos_queue")
        .update({ status: "serving", called_at: new Date().toISOString() })
        .eq("id", queueId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `Calling #${data.queue_number}: ${data.customer_name}` });
      queryClient.invalidateQueries({ queryKey: ["pos-queue"] });
      onServeCustomer(Array.isArray(data.items) ? data.items : [], data.customer_name || "");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const { error } = await supabase
        .from("pos_queue")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", queueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-queue"] });
    },
  });

  const waitingCount = queueItems?.filter((q) => q.status === "waiting").length || 0;
  const servingItem = queueItems?.find((q) => q.status === "serving");

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Queue
          </span>
          <Badge variant="secondary">{waitingCount} waiting</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        {/* Add to queue */}
        <div className="flex gap-2">
          <Input
            placeholder="Customer name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addToQueueMutation.mutate(newCustomerName);
              }
            }}
          />
          <Button
            size="icon"
            onClick={() => addToQueueMutation.mutate(newCustomerName)}
            disabled={addToQueueMutation.isPending}
          >
            {addToQueueMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Currently serving */}
        {servingItem && (
          <div className="p-3 bg-primary/10 border-2 border-primary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-primary">Now Serving</Badge>
              <span className="text-2xl font-bold text-primary">
                #{servingItem.queue_number}
              </span>
            </div>
            <p className="font-medium">{servingItem.customer_name}</p>
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => completeMutation.mutate(servingItem.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
          </div>
        )}

        {/* Queue list */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {queueItems
                ?.filter((q) => q.status === "waiting")
                .map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold">
                        {item.queue_number}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.customer_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {index === 0 ? "Next" : `${index + 1} in line`}
                        </p>
                      </div>
                    </div>
                    {index === 0 && !servingItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => callNextMutation.mutate(item.id)}
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
