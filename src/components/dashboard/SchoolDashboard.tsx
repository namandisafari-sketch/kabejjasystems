import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import ECDDashboard from "./ECDDashboard";
import TeacherDashboard from "./TeacherDashboard";
import BursarDashboard from "./BursarDashboard";
import AdminSchoolDashboard from "./AdminSchoolDashboard";
import WelfareDashboard from "./WelfareDashboard";
import SupportDashboard from "./SupportDashboard";
import AdmissionsDashboard from "./AdmissionsDashboard";
import StoreKeeperDashboard from "./StoreKeeperDashboard";
import {
  STAFF_FINANCE_ROLES,
  STAFF_WELFARE_ROLES,
  STAFF_SUPPORT_ROLES,
} from "@/lib/staff-routing";

const SchoolDashboard = () => {
  const { data: tenant } = useTenant();
  const { hasFullAccess, staffType, isLoading: permissionsLoading } = useStaffPermissions();

  const isECD = tenant?.businessType === 'kindergarten';
  if (isECD) return <ECDDashboard />;

  if (permissionsLoading) {
    return <div className="container mx-auto px-4 py-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!hasFullAccess) {
    if (staffType === 'teacher' || staffType === 'class_teacher' || staffType === 'subject_teacher') return <TeacherDashboard />;
    if (STAFF_FINANCE_ROLES.has(staffType)) return <BursarDashboard />;
    if (STAFF_WELFARE_ROLES.has(staffType)) return <WelfareDashboard />;
    if (STAFF_SUPPORT_ROLES.has(staffType)) return <SupportDashboard />;
    if (staffType === 'admissions_officer') return <AdmissionsDashboard />;
    if (staffType === 'store_keeper' || staffType === 'procurement_officer') return <StoreKeeperDashboard />;
  }

  return <AdminSchoolDashboard />;
};

export default SchoolDashboard;
