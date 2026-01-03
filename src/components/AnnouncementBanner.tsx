import { useState, useEffect } from "react";
import { supabase } from "@/hooks/use-database";
import { X, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle();

    if (!profile?.tenant_id) return;

    const { data: tenant } = await supabase
      .from('tenants')
      .select('package_id')
      .eq('id', profile.tenant_id)
      .single();

    const now = new Date().toISOString();
    
    const { data } = await supabase
      .from('announcements')
      .select('id, title, content, priority')
      .eq('is_active', true)
      .not('published_at', 'is', null)
      .order('priority', { ascending: true })
      .order('published_at', { ascending: false });

    if (data) {
      // Load dismissed announcements from localStorage
      const dismissedIds = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
      setDismissed(new Set(dismissedIds));
      setAnnouncements(data);
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify([...newDismissed]));
    
    // Move to next announcement if available
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(Math.max(0, visibleAnnouncements.length - 2));
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));
  const currentAnnouncement = visibleAnnouncements[currentIndex];

  if (visibleAnnouncements.length === 0 || !currentAnnouncement) return null;

  const priorityStyles = {
    urgent: "bg-destructive text-destructive-foreground",
    high: "bg-orange-500 text-white",
    normal: "bg-primary text-primary-foreground",
    low: "bg-muted text-muted-foreground"
  };

  return (
    <div className={cn(
      "w-full transition-all duration-300",
      priorityStyles[currentAnnouncement.priority as keyof typeof priorityStyles] || priorityStyles.normal
    )}>
      <div className="flex items-center gap-2 px-4 py-2">
        <Megaphone className="h-4 w-4 shrink-0" />
        
        <div className="flex-1 min-w-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-left"
          >
            <span className="font-medium text-sm">{currentAnnouncement.title}</span>
            {!isExpanded && currentAnnouncement.content && (
              <span className="text-sm opacity-80 ml-2 hidden sm:inline">
                - {currentAnnouncement.content.substring(0, 60)}...
              </span>
            )}
          </button>
          
          {isExpanded && (
            <p className="text-sm opacity-90 mt-1">{currentAnnouncement.content}</p>
          )}
        </div>

        {visibleAnnouncements.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/20"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">
              {currentIndex + 1}/{visibleAnnouncements.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/20"
              onClick={() => setCurrentIndex(prev => Math.min(visibleAnnouncements.length - 1, prev + 1))}
              disabled={currentIndex === visibleAnnouncements.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-white/20 shrink-0"
          onClick={() => handleDismiss(currentAnnouncement.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
