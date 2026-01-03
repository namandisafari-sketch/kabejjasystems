import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { usePWAMode } from "@/hooks/use-pwa-mode";
import Landing from "./pages/Landing";
import PWAHome from "./pages/PWAHome";
import Signup from "./pages/Signup";
import AdminSignup from "./pages/AdminSignup";
import Login from "./pages/Login";
import PaymentUpload from "./pages/PaymentUpload";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import AcceptInvitation from "./pages/AcceptInvitation";
import { AdminLayout } from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminTenantDetails from "./pages/admin/AdminTenantDetails";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSchoolPackages from "./pages/admin/AdminSchoolPackages";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import AdminInstallations from "./pages/admin/AdminInstallations";
import AdminMarketers from "./pages/admin/AdminMarketers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminSupportTickets from "./pages/admin/AdminSupportTickets";
import AdminBulkActions from "./pages/admin/AdminBulkActions";
import SubmitTestimonial from "./pages/SubmitTestimonial";
import { BusinessLayout } from "./components/BusinessLayout";
import BusinessDashboard from "./pages/business/BusinessDashboard";
import Products from "./pages/business/Products";
import Sales from "./pages/business/Sales";
import Customers from "./pages/business/Customers";
import Staff from "./pages/business/Staff";
import Reports from "./pages/business/Reports";
import Branches from "./pages/business/Branches";
import BusinessSettings from "./pages/business/BusinessSettings";
import Tables from "./pages/business/Tables";
import Menu from "./pages/business/Menu";
import QRCodes from "./pages/business/QRCodes";
import POS from "./pages/business/POS";
import Expenses from "./pages/business/Expenses";
import Employees from "./pages/business/Employees";
import HotelRooms from "./pages/business/HotelRooms";
import RoomBookings from "./pages/business/RoomBookings";
import InternalUsage from "./pages/business/InternalUsage";
import Suppliers from "./pages/business/Suppliers";
import Categories from "./pages/business/Categories";
import PurchaseOrders from "./pages/business/PurchaseOrders";
import BusinessCards from "./pages/business/BusinessCards";
import StockAlerts from "./pages/business/StockAlerts";
import Payroll from "./pages/business/Payroll";
import Services from "./pages/business/Services";
import Jobs from "./pages/business/Jobs";
import SpareParts from "./pages/business/SpareParts";
import Patients from "./pages/business/Patients";
import Prescriptions from "./pages/business/Prescriptions";
import Students from "./pages/business/Students";
import Classes from "./pages/business/Classes";
import Fees from "./pages/business/Fees";
import AcademicTerms from "./pages/business/AcademicTerms";
import Attendance from "./pages/business/Attendance";
import Subjects from "./pages/business/Subjects";
import Inventory from "./pages/business/Inventory";
import Letters from "./pages/business/Letters";
import StudentCards from "./pages/business/StudentCards";
import TermRequirements from "./pages/business/TermRequirements";
import ReportCards from "./pages/business/ReportCards";
import GateCheckin from "./pages/business/GateCheckin";
import VisitorRegister from "./pages/business/VisitorRegister";
import Parents from "./pages/business/Parents";
import ECDPupils from "./pages/business/ECDPupils";
import ECDProgress from "./pages/business/ECDProgress";
import ECDRoles from "./pages/business/ECDRoles";
import ECDLearningAreas from "./pages/business/ECDLearningAreas";
import ECDMarksEntry from "./pages/business/ECDMarksEntry";
import ECDPupilCards from "./pages/business/ECDPupilCards";
import DisciplineCases from "./pages/business/DisciplineCases";
import SendHome from "./pages/business/SendHome";
import RentalDashboard from "./pages/business/rental/RentalDashboard";
import RentalProperties from "./pages/business/rental/RentalProperties";
import RentalUnits from "./pages/business/rental/RentalUnits";
import RentalTenants from "./pages/business/rental/RentalTenants";
import RentalLeases from "./pages/business/rental/RentalLeases";
import RentalPayments from "./pages/business/rental/RentalPayments";
import RentalMaintenance from "./pages/business/rental/RentalMaintenance";
import RentalIDCards from "./pages/business/rental/RentalIDCards";
import RentalPaymentProofs from "./pages/business/rental/RentalPaymentProofs";
import PublicMenu from "./pages/public/PublicMenu";
import SubmitPaymentProof from "./pages/public/SubmitPaymentProof";
import JobStatus from "./pages/public/JobStatus";
import ParentPortal from "./pages/ParentPortal";
import ParentDashboard from "./pages/ParentDashboard";
import ECDParentPortal from "./pages/ECDParentPortal";
import ECDParentDashboard from "./pages/ECDParentDashboard";
import RenterPortal from "./pages/RenterPortal";
import RenterDashboard from "./pages/RenterDashboard";
import SubscriptionExpired from "./pages/SubscriptionExpired";
import NotFound from "./pages/NotFound";
import FirebaseLogin from "./pages/FirebaseLogin";
import { AuthProvider } from "./integrations/supabase/AuthContext";
import { HasuraProvider } from "./integrations/hasura/provider";
// Marketer Portal
import MarketerPortal from "./pages/MarketerPortal";
import { MarketerLayout } from "./components/MarketerLayout";
import MarketerDashboard from "./pages/marketer/MarketerDashboard";
import MarketerReferrals from "./pages/marketer/MarketerReferrals";
import MarketerEarnings from "./pages/marketer/MarketerEarnings";
import MarketerReports from "./pages/marketer/MarketerReports";
// Offline Infrastructure
import { initOfflineDB } from "./lib/offline-db";
import { migrateDexieToPGlite, isMigrationComplete } from "./lib/data-migration";

const queryClient = new QueryClient();

// Initialize offline database on app load
if (typeof window !== 'undefined') {
  const USE_PGLITE = import.meta.env.VITE_USE_PGLITE === 'true';

  initOfflineDB().then(async (success) => {
    if (success) {
      console.log('📦 Offline mode ready');

      // If using PGlite, check if we need to migrate from Dexie
      if (USE_PGLITE) {
        const migrationDone = await isMigrationComplete();
        if (!migrationDone) {
          console.log('🔄 Migrating data from Dexie to PGlite...');
          const result = await migrateDexieToPGlite();
          if (result.success) {
            console.log('✅ Migration successful!', result.stats);
          } else {
            console.error('❌ Migration failed:', result.error);
          }
        }
      }
    }
  });
}

// Smart Home component that shows different UI based on PWA vs browser
function SmartHome() {
  const { isPWA } = usePWAMode();

  // PWA users see category cards, browser users see full landing page
  return isPWA ? <PWAHome /> : <Landing />;
}

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="kabejja-ui-theme">
    <AuthProvider>
      <HasuraProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <HashRouter>
              <Routes>
                <Route path="/" element={<SmartHome />} />
                <Route path="/home" element={<PWAHome />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/admin-signup" element={<AdminSignup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/firebase-login" element={<FirebaseLogin />} />
                <Route path="/payment-upload" element={<PaymentUpload />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/submit-testimonial" element={<SubmitTestimonial />} />

                {/* Admin Routes with Sidebar Layout */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="tenants" element={<AdminTenants />} />
                  <Route path="tenants/:id" element={<AdminTenantDetails />} />
                  <Route path="installations" element={<AdminInstallations />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="marketers" element={<AdminMarketers />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="packages" element={<AdminPackages />} />
                  <Route path="school-packages" element={<AdminSchoolPackages />} />
                  <Route path="audit-logs" element={<AdminAuditLogs />} />
                  <Route path="announcements" element={<AdminAnnouncements />} />
                  <Route path="support-tickets" element={<AdminSupportTickets />} />
                  <Route path="bulk-actions" element={<AdminBulkActions />} />
                  <Route path="testimonials" element={<AdminTestimonials />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Business Routes with Sidebar Layout */}
                <Route path="/business" element={<BusinessLayout />}>
                  <Route index element={<BusinessDashboard />} />
                  <Route path="pos" element={<POS />} />
                  <Route path="products" element={<Products />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="menu" element={<Menu />} />
                  <Route path="tables" element={<Tables />} />
                  <Route path="qr-codes" element={<QRCodes />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="rooms" element={<HotelRooms />} />
                  <Route path="bookings" element={<RoomBookings />} />
                  <Route path="internal-usage" element={<InternalUsage />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="stock-alerts" element={<StockAlerts />} />
                  <Route path="purchase-orders" element={<PurchaseOrders />} />
                  <Route path="business-cards" element={<BusinessCards />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="services" element={<Services />} />
                  <Route path="jobs" element={<Jobs />} />
                  <Route path="spare-parts" element={<SpareParts />} />
                  <Route path="patients" element={<Patients />} />
                  <Route path="prescriptions" element={<Prescriptions />} />
                  <Route path="students" element={<Students />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="fees" element={<Fees />} />
                  <Route path="academic-terms" element={<AcademicTerms />} />
                  <Route path="subjects" element={<Subjects />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="letters" element={<Letters />} />
                  <Route path="student-cards" element={<StudentCards />} />
                  <Route path="term-requirements" element={<TermRequirements />} />
                  <Route path="report-cards" element={<ReportCards />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="branches" element={<Branches />} />
                  <Route path="settings" element={<BusinessSettings />} />
                  <Route path="gate-checkin" element={<GateCheckin />} />
                  <Route path="visitor-register" element={<VisitorRegister />} />
                  <Route path="parents" element={<Parents />} />
                  <Route path="ecd-pupils" element={<ECDPupils />} />
                  <Route path="ecd-progress" element={<ECDProgress />} />
                  <Route path="ecd-roles" element={<ECDRoles />} />
                  <Route path="ecd-learning-areas" element={<ECDLearningAreas />} />
                  <Route path="ecd-marks-entry" element={<ECDMarksEntry />} />
                  <Route path="ecd-pupil-cards" element={<ECDPupilCards />} />
                  <Route path="discipline-cases" element={<DisciplineCases />} />
                  <Route path="send-home" element={<SendHome />} />
                  {/* Rental Management Routes */}
                  <Route path="rental-dashboard" element={<RentalDashboard />} />
                  <Route path="rental-properties" element={<RentalProperties />} />
                  <Route path="rental-units" element={<RentalUnits />} />
                  <Route path="rental-tenants" element={<RentalTenants />} />
                  <Route path="rental-leases" element={<RentalLeases />} />
                  <Route path="rental-payments" element={<RentalPayments />} />
                  <Route path="rental-maintenance" element={<RentalMaintenance />} />
                  <Route path="rental-id-cards" element={<RentalIDCards />} />
                  <Route path="rental-payment-proofs" element={<RentalPaymentProofs />} />
                </Route>

                {/* Parent Portal Routes */}
                <Route path="/parent" element={<ParentPortal />} />
                <Route path="/parent/dashboard" element={<ParentDashboard />} />

                {/* ECD Parent Portal Routes - Distinct child-friendly design */}
                <Route path="/ecd-parent" element={<ECDParentPortal />} />
                <Route path="/ecd-parent/dashboard" element={<ECDParentDashboard />} />

                {/* Renter Portal Routes */}
                <Route path="/renter" element={<RenterPortal />} />
                <Route path="/renter/dashboard" element={<RenterDashboard />} />

                {/* Subscription Expired */}
                <Route path="/subscription-expired" element={<SubscriptionExpired />} />

                {/* Marketer Portal Routes */}
                <Route path="/marketer" element={<MarketerPortal />} />
                <Route path="/marketer" element={<MarketerLayout />}>
                  <Route path="dashboard" element={<MarketerDashboard />} />
                  <Route path="referrals" element={<MarketerReferrals />} />
                  <Route path="earnings" element={<MarketerEarnings />} />
                  <Route path="reports" element={<MarketerReports />} />
                </Route>

                {/* Public Routes */}
                <Route path="/menu/:tenantId" element={<PublicMenu />} />
                <Route path="/menu/:tenantId/:tableId" element={<PublicMenu />} />
                <Route path="/job-status" element={<JobStatus />} />
                <Route path="/submit-payment" element={<SubmitPaymentProof />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HasuraProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
