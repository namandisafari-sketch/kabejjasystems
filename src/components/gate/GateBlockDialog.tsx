import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, User, X } from "lucide-react";
import { createOverrideRequest } from "@/hooks/use-red-list-check";
import { toast } from "sonner";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  class_name?: string;
  photo_url?: string;
}

interface GateBlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  blockingReasons: string[];
  tenantId: string;
  onRequestSubmitted: () => void;
}

// Alert sound URL - using a warning/alarm sound
const ALERT_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1cdF59m6ytrZCHiYuOmqOrrKaXiYGAgISLlZ2hpaShn5ybnaClrK6urKefl5GOj5ScoqitrK2qp6KenZ2foaSmqKmopqOgn5+goaKkpqeoqKaloqCenp+goqSmqKmopaOgnp2dn6ChoqSkpaSioJ6dnZ6foKGjpKSjoZ+dnJydnp+goqOjo6Gfnpycm5ydnp+hoqKioJ6cm5qam5ydnp+goaGgnpyamJmampucnZ6foKCfnZuZmJiYmZqbnJ2enp6dnJqYl5aXmJmam5ydnp2cm5mXlpWWl5iZmpucnJybmpiWlJSVlpeYmZqbm5qamJaUk5OUlZaXmJqam5qZl5WTkpKTlJWWl5mampqZl5WTkZGRk5SVlpiZmpqZl5WTkZCQkpOUlZeYmZmZl5aTkY+PkJGTlJWXmJmZmJaUko+Oj5CRk5SVl5iYmJeVk5CPjo6PkZOUlZeXmJeWlJKQjo2Oj5GTlJWXl5eWlZOQjo2MjY6Rk5SVlpeXlpSSkI2MjIyOkJKUlZaXl5aUko+NjIuLjY+Rk5SVlpaWlJOQjYuKio2Oj5KUlZaWlpSSj42Liop=";

export function GateBlockDialog({
  isOpen,
  onClose,
  student,
  blockingReasons,
  tenantId,
  onRequestSubmitted,
}: GateBlockDialogProps) {
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play alert sound when dialog opens
  useEffect(() => {
    if (isOpen && student) {
      playAlertSound();
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isOpen, student]);

  const playAlertSound = () => {
    try {
      // Create audio context for more reliable sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create an oscillator for alert sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure for alarm-like sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = "square";
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Play second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1000, audioContext.currentTime);
        osc2.type = "square";
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 300);
      
      // Play third beep
      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.setValueAtTime(600, audioContext.currentTime);
        osc3.type = "square";
        gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.8);
      }, 600);
      
    } catch (error) {
      console.error("Failed to play alert sound:", error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!student || !overrideReason.trim()) {
      toast.error("Please provide a reason for override");
      return;
    }

    setIsSubmitting(true);
    
    const result = await createOverrideRequest(
      student.id,
      tenantId,
      blockingReasons.join("; "),
      overrideReason.trim()
    );

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Override request submitted. Waiting for bursar approval.");
      setOverrideReason("");
      onRequestSubmitted();
      onClose();
    } else {
      toast.error(result.error || "Failed to submit request");
    }
  };

  const handleClose = () => {
    setOverrideReason("");
    onClose();
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Entry Blocked - Red List
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <User className="h-6 w-6 text-destructive" />
              </div>
            )}
            <div>
              <p className="font-semibold">{student.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {student.admission_number}
                {student.class_name && ` • ${student.class_name}`}
              </p>
            </div>
          </div>

          {/* Blocking Reasons */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Blocking Reasons
            </Label>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
              {blockingReasons.map((reason, index) => (
                <div key={index} className="flex items-start gap-2">
                  <X className="h-3 w-3 text-destructive mt-1 shrink-0" />
                  <span className="text-sm text-destructive">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Override Reason */}
          <div className="space-y-2">
            <Label>Override Reason (Required)</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this student should be allowed entry despite being on the red list..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be sent to the bursar for approval.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm text-warning-foreground">
              <strong>Note:</strong> The student cannot enter until the bursar approves this request.
              The parent has been notified automatically.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRequest}
            disabled={isSubmitting || !overrideReason.trim()}
          >
            {isSubmitting ? "Submitting..." : "Submit Override Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
