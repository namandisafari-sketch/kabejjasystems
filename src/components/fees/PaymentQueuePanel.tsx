import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, X, ArrowRight, Clock, CheckCircle2 } from "lucide-react";

export interface QueuedStudent {
  id: string;
  full_name: string;
  admission_number: string;
  class_name?: string;
  balance: number;
  scannedAt: Date;
  status: 'waiting' | 'processing' | 'completed';
}

interface PaymentQueuePanelProps {
  queue: QueuedStudent[];
  currentStudent: QueuedStudent | null;
  onSelectStudent: (student: QueuedStudent) => void;
  onRemoveFromQueue: (studentId: string) => void;
  onClearCompleted: () => void;
  formatCurrency: (amount: number) => string;
}

export function PaymentQueuePanel({
  queue,
  currentStudent,
  onSelectStudent,
  onRemoveFromQueue,
  onClearCompleted,
  formatCurrency,
}: PaymentQueuePanelProps) {
  const waitingCount = queue.filter(s => s.status === 'waiting').length;
  const completedCount = queue.filter(s => s.status === 'completed').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Payment Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {waitingCount} waiting
            </Badge>
            {completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onClearCompleted}
              >
                Clear done
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {queue.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No students in queue</p>
              <p className="text-xs mt-1">Scan student IDs to add them</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {queue.map((student, index) => (
                <div
                  key={student.id}
                  className={`
                    relative p-3 rounded-lg border transition-all cursor-pointer
                    ${student.status === 'processing' 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : student.status === 'completed'
                      ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20 opacity-60'
                      : 'border-border hover:bg-muted/50'
                    }
                  `}
                  onClick={() => student.status === 'waiting' && onSelectStudent(student)}
                >
                  {/* Queue Position */}
                  {student.status === 'waiting' && (
                    <div className="absolute -left-1 -top-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{student.full_name}</p>
                        {student.status === 'processing' && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-primary">
                            <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
                            Now
                          </Badge>
                        )}
                        {student.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{student.admission_number}</p>
                      {student.class_name && (
                        <p className="text-xs text-muted-foreground">{student.class_name}</p>
                      )}
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1">
                      {student.status !== 'completed' && student.balance > 0 && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatCurrency(student.balance)}
                        </Badge>
                      )}
                      {student.status === 'waiting' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromQueue(student.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Time indicator */}
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeAgo(student.scannedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 120) return '1 min ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  return `${Math.floor(seconds / 3600)} hrs ago`;
}
