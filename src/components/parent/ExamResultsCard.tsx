import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface ExamSession {
  id: string;
  year: number;
  level: string;
  session_name: string;
}

export function ExamResultsCard() {
  const navigate = useNavigate();
  const [indexNumber, setIndexNumber] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [searching, setSearching] = useState(false);

  // Fetch available exam sessions
  const { data: examSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["exam-sessions-parent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_sessions")
        .select("id, year, level, session_name")
        .eq("is_active", true)
        .order("year", { ascending: false });

      if (error) throw error;
      return data as ExamSession[];
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!indexNumber.trim()) {
      toast.error("Please enter an index number");
      return;
    }

    if (!sessionId) {
      toast.error("Please select an exam session");
      return;
    }

    setSearching(true);

    try {
      // Check if result exists
      const { data: result, error } = await supabase
        .from("exam_results")
        .select("id")
        .eq("index_number", indexNumber.toUpperCase())
        .eq("exam_session_id", sessionId)
        .eq("result_status", "published")
        .single();

      if (error || !result) {
        toast.error("No exam results found for this index number and session");
        setSearching(false);
        return;
      }

      // Log access
      await supabase.from("exam_access_logs").insert({
        index_number: indexNumber.toUpperCase(),
        exam_session_id: sessionId,
        access_status: "success",
        ip_address: "client",
        user_agent: navigator.userAgent,
      });

      // Navigate to results page
      navigate(`/exam-results/${result.id}`, {
        state: {
          indexNumber: indexNumber.toUpperCase(),
          sessionId,
        },
      });
    } catch (error) {
      console.error("Search error:", error);
      toast.error("An error occurred while searching");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Award className="h-5 w-5 text-primary" />
          Check UNEB Exam Results
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Look up national examination results by index number
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Index Number */}
            <div className="space-y-1.5">
              <Label htmlFor="index-number" className="text-xs sm:text-sm">
                Index Number
              </Label>
              <Input
                id="index-number"
                placeholder="e.g., U0001/001"
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
                className="h-9 text-sm"
                disabled={searching}
              />
            </div>

            {/* Exam Session */}
            <div className="space-y-1.5">
              <Label htmlFor="exam-session" className="text-xs sm:text-sm">
                Exam Year & Level
              </Label>
              <Select
                value={sessionId}
                onValueChange={setSessionId}
                disabled={searching || sessionsLoading}
              >
                <SelectTrigger id="exam-session" className="h-9 text-sm">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent>
                  {examSessions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No sessions available
                    </SelectItem>
                  ) : (
                    examSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.year} {session.level} - {session.session_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              disabled={searching || examSessions.length === 0}
              className="flex-1"
              size="sm"
            >
              {searching ? (
                <>
                  <Search className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check Results
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/exam-results")}
              className="flex-shrink-0"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Full Lookup
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
