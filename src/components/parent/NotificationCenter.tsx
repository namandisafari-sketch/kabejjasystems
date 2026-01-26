import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Check, CheckCheck, Clock, AlertCircle, GraduationCap, Home, CreditCard } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ParentNotification } from "@/hooks/use-parent-notifications";

interface NotificationCenterProps {
  notifications: ParentNotification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'arrival':
      return <GraduationCap className="h-4 w-4 text-green-500" />;
    case 'departure':
      return <Home className="h-4 w-4 text-blue-500" />;
    case 'fee_reminder':
      return <CreditCard className="h-4 w-4 text-orange-500" />;
    case 'discipline':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationBg = (type: string, isRead: boolean) => {
  if (isRead) return "bg-muted/30";
  
  switch (type) {
    case 'arrival':
      return "bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-500";
    case 'departure':
      return "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500";
    case 'fee_reminder':
      return "bg-orange-50 dark:bg-orange-950/30 border-l-2 border-l-orange-500";
    case 'discipline':
      return "bg-red-50 dark:bg-red-950/30 border-l-2 border-l-red-500";
    default:
      return "bg-primary/5 border-l-2 border-l-primary";
  }
};

export function NotificationCenter({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} new</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                You'll receive updates about your child's activities here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 transition-colors cursor-pointer hover:bg-accent/50",
                    getNotificationBg(notification.type, notification.is_read)
                  )}
                  onClick={() => {
                    if (!notification.is_read) {
                      onMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "text-sm leading-tight",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
