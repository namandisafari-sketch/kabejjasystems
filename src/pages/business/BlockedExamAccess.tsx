import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Lock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BlockedResult {
  id: string;
  index_number: string;
  reason: string;
  expires_at: string | null;
  blocked_at: string;
  notes: string | null;
}

const BlockedExamAccess = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<BlockedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTenant, setIsTenant] = useState(false);

  const [formData, setFormData] = useState({
    indexNumber: "",
    reason: "",
    notes: "",
    expiresInDays: "0", // 0 = permanent
  });

  // Check if user is school admin
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Unauthorized",
            description: "You must be logged in",
            variant: "destructive",
          });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .single();

        if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
          toast({
            title: "Unauthorized",
            description: "Only school administrators can manage exam access blocks",
            variant: "destructive",
          });
          return;
        }

        if (!profile.tenant_id) {
          toast({
            title: "Unauthorized",
            description: "You must be associated with a school",
            variant: "destructive",
          });
          return;
        }

        setIsTenant(true);
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    checkAccess();
  }, [toast]);

  // Fetch blocked results
  useEffect(() => {
    if (!isTenant) return;

    const fetchBlocks = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single();

        const { data, error } = await supabase
          .from('exam_result_blocks')
          .select('*')
          .eq('school_id', profile?.tenant_id)
          .order('blocked_at', { ascending: false });

        if (error) throw error;
        setBlocks(data || []);
      } catch (error) {
        console.error('Error fetching blocks:', error);
        toast({
          title: "Error",
          description: "Could not load blocked results",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [isTenant, toast]);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.indexNumber.trim()) {
      toast({
        title: "Required",
        description: "Please enter an index number",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("School not found");

      // Find exam result by index number
      const { data: examResult, error: resultError } = await supabase
        .from('exam_results')
        .select('id')
        .eq('index_number', formData.indexNumber.toUpperCase())
        .eq('school_id', profile.tenant_id)
        .single();

      if (resultError || !examResult) {
        toast({
          title: "Not Found",
          description: "No exam result found for this index number at your school",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      // Calculate expiry date if specified
      let expiresAt = null;
      if (parseInt(formData.expiresInDays) > 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(formData.expiresInDays));
        expiresAt = expiryDate.toISOString();
      }

      // Create block
      const { error: blockError } = await supabase
        .from('exam_result_blocks')
        .insert({
          exam_result_id: examResult.id,
          school_id: profile.tenant_id,
          index_number: formData.indexNumber.toUpperCase(),
          reason: formData.reason || null,
          notes: formData.notes || null,
          blocked_by: session.user.id,
          expires_at: expiresAt,
        });

      if (blockError) throw blockError;

      toast({
        title: "Success",
        description: `Result for ${formData.indexNumber} is now blocked`,
      });

      // Reset form and close dialog
      setFormData({
        indexNumber: "",
        reason: "",
        notes: "",
        expiresInDays: "0",
      });
      setIsDialogOpen(false);

      // Refresh blocks list
      const { data: newBlocks } = await supabase
        .from('exam_result_blocks')
        .select('*')
        .eq('school_id', profile.tenant_id)
        .order('blocked_at', { ascending: false });

      if (newBlocks) setBlocks(newBlocks);
    } catch (error: any) {
      console.error('Error creating block:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create block",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!window.confirm("Are you sure you want to remove this block?")) return;

    try {
      const { error } = await supabase
        .from('exam_result_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlocks(blocks.filter((b) => b.id !== blockId));
      toast({
        title: "Success",
        description: "Block removed successfully",
      });
    } catch (error: any) {
      console.error('Error deleting block:', error);
      toast({
        title: "Error",
        description: "Failed to remove block",
        variant: "destructive",
      });
    }
  };

  if (!isTenant) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exam Result Access Control</h1>
        <p className="text-gray-600 mt-2">
          Manage which students can view their UNEB exam results
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          When a result is blocked, the student will see an access denied message and won't be able to view their exam results. Use this for fee defaults, disciplinary cases, or pending documentation.
        </AlertDescription>
      </Alert>

      {/* Create Block Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Block Result Access
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Block Exam Result</DialogTitle>
            <DialogDescription>
              Prevent a student from viewing their exam results
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBlock} className="space-y-4">
            {/* Index Number */}
            <div className="space-y-2">
              <Label htmlFor="indexNumber">Student Index Number *</Label>
              <Input
                id="indexNumber"
                placeholder="e.g., S001234"
                value={formData.indexNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    indexNumber: e.target.value.toUpperCase(),
                  })
                }
                disabled={creating}
              />
              <p className="text-xs text-gray-500">
                The student's UNEB index number
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Block *</Label>
              <select
                value={formData.reason}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reason: e.target.value,
                  })
                }
                disabled={creating}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a reason...</option>
                <option value="Fee not paid">Fee not paid</option>
                <option value="Disciplinary action">Disciplinary action</option>
                <option value="Document pending">Document pending</option>
                <option value="Investigation in progress">
                  Investigation in progress
                </option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Block Expiry (days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="0"
                value={formData.expiresInDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiresInDays: e.target.value,
                  })
                }
                disabled={creating}
              />
              <p className="text-xs text-gray-500">
                0 = permanent until you unblock manually
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes for internal reference..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notes: e.target.value,
                  })
                }
                disabled={creating}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-red-600 hover:bg-red-700"
              >
                {creating ? "Creating..." : "Block Access"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Blocks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Blocks</CardTitle>
          <CardDescription>
            {blocks.length} result{blocks.length !== 1 ? "s" : ""} currently blocked
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : blocks.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No blocked results</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Index Number</TableHeader>
                    <TableHeader>Reason</TableHeader>
                    <TableHeader>Blocked On</TableHeader>
                    <TableHeader>Expires</TableHeader>
                    <TableHeader className="text-right">Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-semibold">
                        {block.index_number}
                      </TableCell>
                      <TableCell className="text-sm">{block.reason}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(block.blocked_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {block.expires_at ? (
                          new Date(block.expires_at) < new Date() ? (
                            <span className="text-red-600">Expired</span>
                          ) : (
                            new Date(block.expires_at).toLocaleDateString()
                          )
                        ) : (
                          <span className="text-gray-600">Permanent</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockedExamAccess;
