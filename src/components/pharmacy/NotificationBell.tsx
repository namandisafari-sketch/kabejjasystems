import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, ShoppingCart, AlertCircle, Info, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcon: Record<string, any> = {
  sale: ShoppingCart,
  reminder: AlertCircle,
  low_stock: AlertCircle,
  info: Info,
};
const typeColor: Record<string, string> = {
  sale: "text-green-600 bg-green-500/10",
  reminder: "text-orange-600 bg-orange-500/10",
  low_stock: "text-destructive bg-destructive/10",
  info: "text-blue-600 bg-blue-500/10",
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

const NotificationBell = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notification[]) || []);
  };

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    fetchItems();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchItems();
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    fetchItems();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors" title="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="font-bold text-sm">Notifications</h3>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => {
                const Icon = typeIcon[n.type] || Info;
                return (
                  <div key={n.id} className={`px-3 py-2.5 flex gap-2.5 hover:bg-accent/40 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${typeColor[n.type] || typeColor.info}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <button className="flex-1 text-left min-w-0" onClick={() => { if (!n.is_read) markRead(n.id); setOpen(false); }}>
                      <p className="font-semibold text-xs truncate">{n.title}</p>
                      {n.message && <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatTime(n.created_at)}</p>
                    </button>
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive transition-all p-1" title="Dismiss">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
