import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Check, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface StaffMember {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  has_exam_import_access: boolean;
}

const ExamImportPermissions = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");

  // Check if user is tenant owner
  useEffect(() => {
    const checkOwnerStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .single();

        if (!profile || profile.role !== 'tenant_owner') {
          toast({
            title: "Unauthorized",
            description: "Only school owners can manage exam import permissions",
            variant: "destructive",
          });
          return;
        }

        setIsOwner(true);
        setTenantId(profile.tenant_id);
        fetchStaff(profile.tenant_id);
      } catch (error: any) {
        console.error('Permission check error:', error);
        toast({
          title: "Error",
          description: "Failed to verify permissions",
          variant: "destructive",
        });
      }
    };

    checkOwnerStatus();
  }, []);

  const fetchStaff = async (schoolId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, permissions')
        .eq('tenant_id', schoolId)
        .neq('role', 'tenant_owner')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const staffWithPermissions = (data || []).map(person => ({
        id: person.id,
        full_name: person.full_name || 'Unknown',
        role: person.role,
        has_exam_import_access: person.permissions?.exam_import_access === true,
      }));

      setStaff(staffWithPermissions);
    } catch (error: any) {
      console.error('Fetch staff error:', error);
      toast({
        title: "Error",
        description: "Failed to load staff members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExamImportAccess = async (staffId: string, currentAccess: boolean) => {
    try {
      setSaving(true);
      
      // Fetch current permissions
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('permissions')
        .eq('id', staffId)
        .single();

      if (fetchError) throw fetchError;

      const currentPermissions = profile?.permissions || {};
      const updatedPermissions = {
        ...currentPermissions,
        exam_import_access: !currentAccess,
      };

      // Update permissions
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', staffId);

      if (updateError) throw updateError;

      // Update local state
      setStaff(staff.map(s => 
        s.id === staffId 
          ? { ...s, has_exam_import_access: !currentAccess }
          : s
      ));

      toast({
        title: "Success",
        description: `Exam import access ${!currentAccess ? 'granted' : 'revoked'}`,
      });
    } catch (error: any) {
      console.error('Toggle access error:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only school owners can manage exam import permissions
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Exam Import Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Grant or revoke exam import access to your staff members
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          You (as school owner) can always import exam results. Grant permission below to allow your staff to do the same.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Your Staff Members</CardTitle>
          <CardDescription>
            {staff.length} staff members in your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading staff members...
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff members found. Invite staff to grant them permissions.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Exam Import Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{person.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {person.has_exam_import_access ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Granted
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Granted</Badge>
                        )}
                        <Button
                          size="sm"
                          variant={person.has_exam_import_access ? "destructive" : "default"}
                          onClick={() => toggleExamImportAccess(person.id, person.has_exam_import_access)}
                          disabled={saving}
                        >
                          {person.has_exam_import_access ? 'Revoke' : 'Grant'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Who Can Import Exam Results?</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You (school owner) - always can import</li>
              <li>Any staff member you grant access to below</li>
              <li>Platform superadmins</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">To Grant Access:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Find the staff member in the table above</li>
              <li>Click "Grant" button</li>
              <li>They can now use the Exam Results Import page</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-1">To Revoke Access:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click "Revoke" button next to their name</li>
              <li>They can no longer import exam results</li>
              <li>You can grant it back anytime</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamImportPermissions;
