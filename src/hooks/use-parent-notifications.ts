import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParentNotification {
  id: string;
  tenant_id: string;
  parent_id: string;
  student_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useParentNotifications(parentId: string | undefined) {
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!parentId) return;
    
    try {
      const { data, error } = await supabase
        .from("parent_notifications")
        .select("*")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const typedData = (data || []) as unknown as ParentNotification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("parent_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!parentId) return;
    
    try {
      const { error } = await supabase
        .from("parent_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("parent_id", parentId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [parentId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!parentId) return;

    fetchNotifications();

    const channel = supabase
      .channel(`parent-notifications-${parentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_notifications',
          filter: `parent_id=eq.${parentId}`,
        },
        (payload) => {
          const newNotification = payload.new as ParentNotification;
          
          // Add to list
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast based on type
          if (newNotification.type === 'arrival') {
            toast.success(newNotification.title, {
              description: newNotification.message,
              duration: 8000,
            });
          } else if (newNotification.type === 'departure') {
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 8000,
            });
          } else {
            toast(newNotification.title, {
              description: newNotification.message,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
