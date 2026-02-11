import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import ECDDashboard from "./ECDDashboard";
import TeacherDashboard from "./TeacherDashboard";
import BursarDashboard from "./BursarDashboard";
import AdminSchoolDashboard from "./AdminSchoolDashboard";

const SchoolDashboard = () => {
  const { data: tenant } = useTenant();
  const { hasFullAccess, staffType, isLoading: permissionsLoading } = useStaffPermissions();

  const isECD = tenant?.businessType === 'kindergarten';
  if (isECD) return <ECDDashboard />;

  if (permissionsLoading) {
    return <div className="container mx-auto px-4 py-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!hasFullAccess) {
    if (staffType === 'teacher') return <TeacherDashboard />;
    if (staffType === 'bursar') return <BursarDashboard />;
  }

  return <AdminSchoolDashboard />;
};

export default SchoolDashboard;
