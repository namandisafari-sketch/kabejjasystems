import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isThisWeek } from "date-fns";
import { Plus, Send, MessageSquare, ChevronLeft, Search, CheckCheck, Check } from "lucide-react";

type RentalTenant = {
  id: string;
  full_name: string;
  phone: string;
  rental_units: { unit_number: string; rental_properties: { name: string } } | null;
};

type RentalMessage = {
  id: string;
  tenant_id: string;
  rental_tenant_id: string;
  lease_id: string | null;
  subject: string;
  message: string;
  sender_type: "manager" | "tenant";
  sender_id: string;
  is_read: boolean;
  parent_message_id: string | null;
  created_at: string;
};

type Conversation = {
  rental_tenant_id: string;
  tenant: RentalTenant;
  lastMessage: RentalMessage;
  unreadCount: number;
};

export default function RentalMessages() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [newMsgForm, setNewMsgForm] = useState({ rental_tenant_id: "", subject: "", message: "" });

  const userId = tenantId;

  const { data: tenants = [] } = useQuery({
    queryKey: ["rental-tenants-active", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_tenants")
        .select("*, rental_units(unit_number, rental_properties(name))")
        .eq("tenant_id", tenantId!)
        .eq("status", "active");
      if (error) throw error;
      return data as unknown as RentalTenant[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["rental-messages", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_messages")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RentalMessage[];
    },
  });

  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const conversations: Conversation[] = (() => {
    const grouped = new Map<string, RentalMessage[]>();
    for (const msg of messages) {
      const existing = grouped.get(msg.rental_tenant_id) || [];
      existing.push(msg);
      grouped.set(msg.rental_tenant_id, existing);
    }
    const result: Conversation[] = [];
    for (const [rentalTenantId, msgs] of grouped) {
      const tenant = tenantMap.get(rentalTenantId);
      if (!tenant) continue;
      const sorted = msgs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      result.push({
        rental_tenant_id: rentalTenantId,
        tenant,
        lastMessage: sorted[0],
        unreadCount: msgs.filter((m) => m.sender_type === "tenant" && !m.is_read).length,
      });
    }
    result.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
    return result;
  })();

  const filteredConversations = conversations.filter(
    (c) =>
      c.tenant.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalConversations = conversations.length;
  const unreadMessages = messages.filter((m) => m.sender_type === "tenant" && !m.is_read).length;
  const sentThisWeek = messages.filter(
    (m) => m.sender_type === "manager" && isThisWeek(new Date(m.created_at))
  ).length;

  const { data: threadMessages = [] } = useQuery({
    queryKey: ["rental-messages-thread", tenantId, selectedTenantId],
    enabled: !!tenantId && !!selectedTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_messages")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("rental_tenant_id", selectedTenantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as RentalMessage[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from("rental_messages")
        .update({ is_read: true })
        .in("id", messageIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-messages"] });
    },
  });

  useEffect(() => {
    if (!selectedTenantId || !threadMessages.length) return;
    const unreadIds = threadMessages
      .filter((m) => m.sender_type === "tenant" && !m.is_read)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
    }
  }, [selectedTenantId, threadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const sendMutation = useMutation({
    mutationFn: async (data: { rental_tenant_id: string; subject: string; message: string }) => {
      const { error } = await supabase.from("rental_messages").insert({
        tenant_id: tenantId,
        rental_tenant_id: data.rental_tenant_id,
        subject: data.subject,
        message: data.message,
        sender_type: "manager",
        sender_id: userId,
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-messages"] });
      queryClient.invalidateQueries({ queryKey: ["rental-messages-thread"] });
      setReplyText("");
      toast({ title: "Message sent" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const newConversationMutation = useMutation({
    mutationFn: async (data: { rental_tenant_id: string; subject: string; message: string }) => {
      const { error } = await supabase.from("rental_messages").insert({
        tenant_id: tenantId,
        rental_tenant_id: data.rental_tenant_id,
        subject: data.subject,
        message: data.message,
        sender_type: "manager",
        sender_id: userId,
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-messages"] });
      setNewMsgOpen(false);
      setNewMsgForm({ rental_tenant_id: "", subject: "", message: "" });
      toast({ title: "Conversation started" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTenantId) return;
    const subject = threadMessages.length > 0 ? threadMessages[0].subject : "Reply";
    sendMutation.mutate({
      rental_tenant_id: selectedTenantId,
      subject,
      message: replyText.trim(),
    });
  };

  const handleNewConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgForm.rental_tenant_id || !newMsgForm.subject.trim() || !newMsgForm.message.trim()) return;
    newConversationMutation.mutate(newMsgForm);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedTenantId(id);
    setMobileView("thread");
  };

  const handleBack = () => {
    setMobileView("list");
    setSelectedTenantId(null);
  };

  const selectedTenant = selectedTenantId ? tenantMap.get(selectedTenantId) : null;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Communicate with your tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Dialog open={newMsgOpen} onOpenChange={(o) => { setNewMsgOpen(o); if (!o) setNewMsgForm({ rental_tenant_id: "", subject: "", message: "" }); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Conversation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNewConversation} className="space-y-4">
                <div>
                  <Label>Tenant</Label>
                  <Select
                    value={newMsgForm.rental_tenant_id}
                    onValueChange={(v) => setNewMsgForm({ ...newMsgForm, rental_tenant_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
                          {t.rental_units ? ` - ${(t.rental_units as any).rental_properties?.name} ${t.rental_units.unit_number}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={newMsgForm.subject}
                    onChange={(e) => setNewMsgForm({ ...newMsgForm, subject: e.target.value })}
                    placeholder="Subject"
                    required
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={newMsgForm.message}
                    onChange={(e) => setNewMsgForm({ ...newMsgForm, message: e.target.value })}
                    placeholder="Type your message..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setNewMsgOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={newConversationMutation.isPending}>
                    Send Message
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative md:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent This Week</CardTitle>
            <Send className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex md:hidden">
        {mobileView === "thread" && selectedTenant && (
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Conversations
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[380px_1fr] h-[calc(100vh-320px)] min-h-[500px]">
        <Card className={`${mobileView === "thread" ? "hidden md:block" : ""} overflow-hidden`}>
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full">
              {filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
                  {searchQuery ? "No conversations match your search" : "No conversations yet. Start a new one!"}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.rental_tenant_id}
                      onClick={() => handleSelectConversation(conv.rental_tenant_id)}
                      className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                        selectedTenantId === conv.rental_tenant_id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {conv.tenant.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm truncate">{conv.tenant.full_name}</p>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(conv.lastMessage.created_at), "MMM d")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.tenant.rental_units
                              ? `${(conv.tenant.rental_units as any).rental_properties?.name} - ${conv.tenant.rental_units.unit_number}`
                              : "No unit assigned"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-muted-foreground truncate flex-1">
                              {conv.lastMessage.message}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className={`${mobileView === "list" ? "hidden md:block" : ""} flex flex-col`}>
          {!selectedTenantId || !selectedTenant ? (
            <div className="flex items-center justify-center h-full text-muted-foreground p-6 text-center">
              <div>
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b py-3 px-4 shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {selectedTenant.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{selectedTenant.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedTenant.rental_units
                        ? `${(selectedTenant.rental_units as any).rental_properties?.name} - ${selectedTenant.rental_units.unit_number}`
                        : "No unit assigned"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {threadMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">No messages in this thread</p>
                    ) : (
                      threadMessages.map((msg) => {
                        const isManager = msg.sender_type === "manager";
                        return (
                          <div key={msg.id} className={`flex ${isManager ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                isManager
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <div
                                className={`flex items-center gap-1 mt-1 ${
                                  isManager ? "justify-end" : "justify-start"
                                }`}
                              >
                                <span
                                  className={`text-[10px] ${
                                    isManager ? "text-primary-foreground/70" : "text-muted-foreground"
                                  }`}
                                >
                                  {format(new Date(msg.created_at), "MMM d, h:mm a")}
                                </span>
                                {isManager && (
                                  msg.is_read ? (
                                    <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                                  ) : (
                                    <Check className="h-3 w-3 text-primary-foreground/50" />
                                  )
                                )}
                                {!isManager && !msg.is_read && (
                                  <Badge variant="outline" className="h-4 text-[10px] px-1 border-blue-300 text-blue-600">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>
              <div className="border-t p-3 shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="min-h-[40px] max-h-[120px] text-sm"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendReply}
                    disabled={sendMutation.isPending || !replyText.trim()}
                    className="shrink-0 self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
