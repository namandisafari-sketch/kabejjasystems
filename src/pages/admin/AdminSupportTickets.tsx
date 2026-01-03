import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/hooks/use-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageSquare, Send, Filter, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminSupportTickets() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data, error } = await db
        .from("support_tickets")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    enabled: !!selectedTicket,
    queryFn: async () => {
      const { data, error } = await db
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "resolved" || status === "closed") {
        const { data: user } = await db.auth.getUser();
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user.user?.id;
      }
      const { error } = await db.from("support_tickets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { data: user } = await db.auth.getUser();
      const { error } = await db.from("support_ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: user.user?.id,
        sender_type: "admin",
        message,
      });
      if (error) throw error;

      // Update ticket status to waiting_response if it was open
      await db
        .from("support_tickets")
        .update({ status: "waiting_response" })
        .eq("id", ticketId)
        .eq("status", "open");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      setReplyMessage("");
      toast.success("Reply sent");
    },
    onError: () => toast.error("Failed to send reply"),
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      open: { variant: "destructive", label: "Open" },
      in_progress: { variant: "default", label: "In Progress" },
      waiting_response: { variant: "outline", label: "Waiting Response" },
      resolved: { variant: "secondary", label: "Resolved" },
      closed: { variant: "secondary", label: "Closed" },
    };
    const c = config[status] || { variant: "default", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "default",
      high: "outline",
      critical: "destructive",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  };

  const filteredTickets = tickets?.filter((t) => statusFilter === "all" || t.status === statusFilter);

  const openCount = tickets?.filter((t) => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter((t) => t.status === "in_progress").length || 0;
  const resolvedCount = tickets?.filter((t) => ["resolved", "closed"].includes(t.status)).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">Manage tenant support requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" /> In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> All Tickets
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_response">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredTickets?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tickets found</p>
          ) : (
            <div className="space-y-3">
              {filteredTickets?.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                        <Badge variant="outline">{ticket.category}</Badge>
                      </div>
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {ticket.tenants?.name || "Unknown tenant"} • {format(new Date(ticket.created_at), "PPp")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              <span className="font-mono text-sm">{selectedTicket?.ticket_number}</span>
            </SheetTitle>
          </SheetHeader>
          {selectedTicket && (
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/50">
                <p className="text-sm">{selectedTicket.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  From: {selectedTicket.tenants?.name} • {format(new Date(selectedTicket.created_at), "PPp")}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(v) => {
                    updateStatusMutation.mutate({ id: selectedTicket.id, status: v });
                    setSelectedTicket({ ...selectedTicket, status: v });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_response">Waiting Response</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Messages</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {messages?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  ) : (
                    messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${
                          msg.sender_type === "admin" ? "bg-primary/10 ml-4" : "bg-muted mr-4"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {msg.sender_type === "admin" ? "Admin" : "Tenant"} • {format(new Date(msg.created_at), "Pp")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                />
                <Button
                  onClick={() => sendReplyMutation.mutate({ ticketId: selectedTicket.id, message: replyMessage })}
                  disabled={!replyMessage.trim() || sendReplyMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
