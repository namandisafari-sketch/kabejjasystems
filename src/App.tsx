import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/i18n";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useWelcomeNotifications } from "@/hooks/use-welcome-notifications";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import { ProtectedStaffRoute } from "@/components/ProtectedStaffRoute";
import { TeacherLayout } from "@/components/portal/TeacherLayout";
import { DOSLayout } from "@/components/portal/DOSLayout";
import { HeadTeacherLayout } from "@/components/portal/HeadTeacherLayout";
import TeacherDashboard from "./pages/portal/teacher/Dashboard";
import MyClasses from "./pages/portal/teacher/MyClasses";
import TeacherAttendance from "./pages/portal/teacher/Attendance";
import Marks from "./pages/portal/teacher/Marks";
import CreateAssignment from "./pages/portal/teacher/CreateAssignment";
import OnlineMarking from "./pages/portal/teacher/OnlineMarking";
import SchemeOfWork from "./pages/portal/teacher/SchemeOfWork";
import LessonPlan from "./pages/portal/teacher/LessonPlan";
import LessonTracker from "./pages/portal/teacher/LessonTracker";
import PerformanceAnalysis from "./pages/portal/teacher/PerformanceAnalysis";
import SubjectAverages from "./pages/portal/teacher/SubjectAverages";
import ClassRanking from "./pages/portal/teacher/ClassRanking";
import TeacherProfile from "./pages/portal/teacher/TeacherProfile";
import TeacherPassword from "./pages/portal/teacher/TeacherPassword";
import PersonalFinance from "./pages/portal/teacher/PersonalFinance";
import TeacherStudents from "./pages/portal/teacher/Students";
import TeacherResources from "./pages/portal/teacher/Resources";
import TeacherOnboarding from "./pages/TeacherOnboarding";
import DOSDashboard from "./pages/portal/dos/Dashboard";
import SubjectAllocation from "./pages/portal/dos/SubjectAllocation";
import ExamManagement from "./pages/portal/dos/ExamManagement";
import TopStudents from "./pages/portal/dos/TopStudents";
import CreateExam from "./pages/portal/dos/CreateExam";
import ResultApproval from "./pages/portal/dos/ResultApproval";
import PromotionLists from "./pages/portal/dos/PromotionLists";
import ExamAnalysis from "./pages/portal/dos/ExamAnalysis";
import MeanScores from "./pages/portal/dos/MeanScores";
import SlowLearners from "./pages/portal/dos/SlowLearners";
import HeadTeacherDashboard from "./pages/portal/headteacher/Dashboard";
import StaffManagement from "./pages/portal/headteacher/StaffManagement";
import FeesManagement from "./pages/portal/headteacher/FeesManagement";
import SchoolProfile from "./pages/portal/headteacher/SchoolProfile";
import AdmissionsManagement from "./pages/portal/headteacher/AdmissionsManagement";
import LeaveManagement from "./pages/portal/headteacher/LeaveManagement";
import Budget from "./pages/portal/headteacher/Budget";
import AcademicPerformance from "./pages/portal/headteacher/AcademicPerformance";
import { SmartDataView } from "./pages/portal/shared/SmartDataView";
import PWAHome from "./pages/PWAHome";
import OnboardingGate from "./components/OnboardingGate";
import Signup from "./pages/Signup";
import AdminSignup from "./pages/AdminSignup";
import Login from "./pages/Login";
import PaymentUpload from "./pages/PaymentUpload";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import AcceptInvitation from "./pages/AcceptInvitation";
import ExamResultsLookup from "./pages/public/ExamResultsLookup";
import VerifyStudent from "./pages/public/VerifyStudent";
import ExamResults from "./pages/public/ExamResults";
import { AdminLayout } from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminTenantDetails from "./pages/admin/AdminTenantDetails";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSchoolPackages from "./pages/admin/AdminSchoolPackages";
import AdminRentalPackages from "./pages/admin/AdminRentalPackages";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminCreateBusiness from "./pages/admin/AdminCreateBusiness";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminFeatureFlags from "./pages/admin/AdminFeatureFlags";
import AdminStorage from "./pages/admin/AdminStorage";
import AdminBackups from "./pages/admin/AdminBackups";
import AdminSponsors from "./pages/admin/AdminSponsors";
import AdminSuggestions from "./pages/admin/AdminSuggestions";
import AdminStaffReviews from "./pages/admin/AdminStaffReviews";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminStudentAccounts from "./pages/admin/AdminStudentAccounts";
import AdminWithdrawal from "./pages/admin/AdminWithdrawal";
import AdminPartnershipDeed from "./pages/admin/AdminPartnershipDeed";
import { AdminDataImport } from "./pages/admin/AdminDataImport";
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
import Accounting from "./pages/business/Accounting";
import Services from "./pages/business/Services";
import Jobs from "./pages/business/Jobs";
import SpareParts from "./pages/business/SpareParts";
import Patients from "./pages/business/Patients";
import Prescriptions from "./pages/business/Prescriptions";
import Students from "./pages/business/Students";
import Classes from "./pages/business/Classes";
import Fees from "./pages/business/Fees";
import BlockedExamAccess from "./pages/business/BlockedExamAccess";
import ImportExamResults from "./pages/business/ImportExamResults";
import ImportExamResultsExcel from "./pages/business/ImportExamResultsExcel";
import ExamImportPermissions from "./pages/business/ExamImportPermissions";
import ExamSessions from "./pages/business/ExamSessions";
import AcademicTerms from "./pages/business/AcademicTerms";
import Attendance from "./pages/business/Attendance";
import Subjects from "./pages/business/Subjects";
import Inventory from "./pages/business/Inventory";
import ProductDetail from "./pages/business/ProductDetail";
import Letters from "./pages/business/Letters";
import StudentsImport from "./pages/business/StudentsImport";
import StaffImport from "./pages/business/StaffImport";
import EmployeeOnboarding from "./pages/business/EmployeeOnboarding";
import FeesImport from "./pages/business/FeesImport";
import AttendanceImport from "./pages/business/AttendanceImport";
import InventoryImport from "./pages/business/InventoryImport";
import ParentsImport from "./pages/business/ParentsImport";
import ClassesImport from "./pages/business/ClassesImport";
import SubjectsImport from "./pages/business/SubjectsImport";
import Grades from "./pages/business/Grades";
import StudentCards from "./pages/business/StudentCards";
import TermRequirements from "./pages/business/TermRequirements";
import ReportCards from "./pages/business/ReportCards";
import MarksEntry from "./pages/business/MarksEntry";
import GateCheckin from "./pages/business/GateCheckin";
import VisitorRegister from "./pages/business/VisitorRegister";
import Parents from "./pages/business/Parents";
import Assets from "./pages/business/Assets";
import ECDPupils from "./pages/business/ECDPupils";
import ECDProgress from "./pages/business/ECDProgress";
import ECDRoles from "./pages/business/ECDRoles";
import ECDLearningAreas from "./pages/business/ECDLearningAreas";
import ECDMarksEntry from "./pages/business/ECDMarksEntry";
import ECDPupilCards from "./pages/business/ECDPupilCards";
import DisciplineCases from "./pages/business/DisciplineCases";
import DisciplineAppeals from "./pages/business/DisciplineAppeals";
import Counseling from "./pages/business/Counseling";
import Requisitions from "./pages/business/Requisitions";
import Timetable from "./pages/business/Timetable";
import Exams from "./pages/business/Exams";
import TermCalendar from "./pages/business/TermCalendar";
import UNEBCandidates from "./pages/business/UNEBCandidates";
import AcademicAnalytics from "./pages/business/AcademicAnalytics";

import AdmissionLinks from "./pages/business/AdmissionLinks";
import AdmissionConfirmations from "./pages/business/AdmissionConfirmations";
import StudentLifecycle from "./pages/business/StudentLifecycle";
import PromotionRules from "./pages/business/PromotionRules";
import SchoolHolidays from "./pages/business/SchoolHolidays";
import SubjectCombinations from "./pages/business/SubjectCombinations";
import ContinuousAssessment from "./pages/business/ContinuousAssessment";
import Suggestions from "./pages/business/Suggestions";
import StaffReviews from "./pages/business/StaffReviews";
import NotificationSettings from "./pages/business/NotificationSettings";
import NotificationLog from "./pages/business/NotificationLog";
import ParentNotificationPreferences from "./pages/business/ParentNotificationPreferences";
import RentalDashboard from "./pages/business/rental/RentalDashboard";
import RentalProperties from "./pages/business/rental/RentalProperties";
import RentalUnits from "./pages/business/rental/RentalUnits";
import RentalTenants from "./pages/business/rental/RentalTenants";
import RentalLeases from "./pages/business/rental/RentalLeases";
import RentalPayments from "./pages/business/rental/RentalPayments";
import RentalMaintenance from "./pages/business/rental/RentalMaintenance";
import RentalIDCards from "./pages/business/rental/RentalIDCards";
import RentalPaymentProofs from "./pages/business/rental/RentalPaymentProofs";
import RentalTaxDashboard from "./pages/business/rental/RentalTaxDashboard";
import RentalExpenses from "./pages/business/rental/RentalExpenses";
import RentalRecurringBilling from "./pages/business/rental/RentalRecurringBilling";
import RentalFinancialReports from "./pages/business/rental/RentalFinancialReports";
import RentalPreventativeMaintenance from "./pages/business/rental/RentalPreventativeMaintenance";
import RentalMessages from "./pages/business/rental/RentalMessages";
import RentalELeasing from "./pages/business/rental/RentalELeasing";
import PublicMenu from "./pages/public/PublicMenu";
import SubmitPaymentProof from "./pages/public/SubmitPaymentProof";
import JobStatus from "./pages/public/JobStatus";
import SelfAdmission from "./pages/public/SelfAdmission";
import SuggestionBox from "./pages/public/SuggestionBox";
import StudentLogin from "./pages/StudentLogin";
import StudentAuthCallback from "./pages/student/StudentAuthCallback";
import StudentSetPassword from "./pages/StudentSetPassword";
import StudentLayout from "./pages/StudentLayout";
import StudentIDCard from "./pages/student/IDCard";
import StudentExams from "./pages/student/Exams";
import StudentExamCards from "./pages/student/ExamCards";
import StudentDashboard from "./pages/student/Dashboard";
import StudentPerformance from "./pages/student/Performance";
import StudentReportCards from "./pages/student/ReportCards";
import StudentTimetable from "./pages/student/Timetable";
import StudentFees from "./pages/student/Fees";
import StudentEvents from "./pages/student/Events";
import StudentResources from "./pages/student/Resources";
import StudentCurriculum from "./pages/student/Curriculum";
import StudentSuggestions from "./pages/student/Suggestions";
import DisciplineBlocked from "./pages/student/DisciplineBlocked";
import AppealDisciplineCase from "./pages/student/AppealDisciplineCase";
import PublicStaffReviews from "./pages/public/StaffReviews";
import ParentPortal from "./pages/ParentPortal";
import ParentDashboard from "./pages/ParentDashboard";
import ECDParentPortal from "./pages/ECDParentPortal";
import ECDParentDashboard from "./pages/ECDParentDashboard";
import RenterPortal from "./pages/RenterPortal";
import RenterDashboard from "./pages/RenterDashboard";
import SubscriptionExpired from "./pages/SubscriptionExpired";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import TermsAndConditions from "./pages/TermsAndConditions";

const queryClient = new QueryClient();

const App = () => {
  // Initialize welcome notifications (requests permission & sends greet)
  useWelcomeNotifications();

  return (
    <LanguageProvider>
    <ThemeProvider defaultTheme="light" storageKey="kabejja-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <InstallPrompt />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<OnboardingGate />} />
              <Route path="/home" element={<PWAHome />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin-signup" element={<AdminSignup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/payment-upload" element={<PaymentUpload />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/submit-testimonial" element={<SubmitTestimonial />} />
              
              {/* UNEB Exam Results - Public Access */}
              <Route path="/exam-results" element={<ExamResultsLookup />} />
              <Route path="/exam-results/:resultId" element={<ExamResults />} />

              {/* Public Student ID Card Verification */}
              <Route path="/verify-student" element={<VerifyStudent />} />

              {/* Admin Routes with Sidebar Layout */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="create-business" element={<AdminCreateBusiness />} />
                <Route path="tenants" element={<AdminTenants />} />
                <Route path="tenants/:id" element={<AdminTenantDetails />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="packages" element={<AdminPackages />} />
                <Route path="school-packages" element={<AdminSchoolPackages />} />
                <Route path="rental-packages" element={<AdminRentalPackages />} />
                <Route path="system-health" element={<AdminSystemHealth />} />
                <Route path="feature-flags" element={<AdminFeatureFlags />} />
                <Route path="storage" element={<AdminStorage />} />
                <Route path="backups" element={<AdminBackups />} />
                <Route path="sponsors" element={<AdminSponsors />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="suggestions" element={<AdminSuggestions />} />
                <Route path="staff-reviews" element={<AdminStaffReviews />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="student-accounts" element={<AdminStudentAccounts />} />
                <Route path="withdrawal" element={<AdminWithdrawal />} />
                <Route path="partnership-deed" element={<AdminPartnershipDeed />} />
                <Route path="data-import" element={<AdminDataImport />} />
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
                <Route path="accounting" element={<Accounting />} />
                <Route path="services" element={<Services />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="spare-parts" element={<SpareParts />} />
                <Route path="patients" element={<Patients />} />
                <Route path="prescriptions" element={<Prescriptions />} />
                <Route path="students" element={<Students />} />
                <Route path="students-import" element={<StudentsImport />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes-import" element={<ClassesImport />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="attendance-import" element={<AttendanceImport />} />
                <Route path="fees" element={<Fees />} />
                <Route path="fees-import" element={<FeesImport />} />
                <Route path="exam-access" element={<BlockedExamAccess />} />
                <Route path="exam-sessions" element={<ExamSessions />} />
                <Route path="exam-results-import" element={<ImportExamResults />} />
                <Route path="exam-results-import-excel" element={<ImportExamResultsExcel />} />
                <Route path="exam-import-permissions" element={<ExamImportPermissions />} />
                <Route path="academic-terms" element={<AcademicTerms />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="subjects-import" element={<SubjectsImport />} />
                <Route path="grades" element={<Grades />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/:id" element={<ProductDetail />} />
                <Route path="inventory-import" element={<InventoryImport />} />
                <Route path="letters" element={<Letters />} />
                <Route path="student-cards" element={<StudentCards />} />
                <Route path="term-requirements" element={<TermRequirements />} />
                <Route path="report-cards" element={<ReportCards />} />
                <Route path="marks-entry" element={<MarksEntry />} />
                <Route path="employee-onboarding" element={<EmployeeOnboarding />} />
                <Route path="staff" element={<Staff />} />
                <Route path="staff-import" element={<StaffImport />} />
                <Route path="parents" element={<Parents />} />
                <Route path="parents-import" element={<ParentsImport />} />
                <Route path="reports" element={<Reports />} />
                <Route path="branches" element={<Branches />} />
                <Route path="settings" element={<BusinessSettings />} />
                <Route path="gate-checkin" element={<GateCheckin />} />
                <Route path="visitor-register" element={<VisitorRegister />} />
                <Route path="parents" element={<Parents />} />
                <Route path="assets" element={<Assets />} />
                <Route path="ecd-pupils" element={<ECDPupils />} />
                <Route path="ecd-progress" element={<ECDProgress />} />
                <Route path="ecd-roles" element={<ECDRoles />} />
                <Route path="ecd-learning-areas" element={<ECDLearningAreas />} />
                <Route path="ecd-marks-entry" element={<ECDMarksEntry />} />
                <Route path="ecd-pupil-cards" element={<ECDPupilCards />} />
                <Route path="discipline-cases" element={<DisciplineCases />} />
                <Route path="discipline" element={<DisciplineAppeals />} />
                <Route path="counseling" element={<Counseling />} />
                <Route path="requisitions" element={<Requisitions />} />
                {/* Phase 2: Academics, Timetable & Exams */}
                <Route path="timetable" element={<Timetable />} />
                <Route path="exams" element={<Exams />} />
                <Route path="academic-analytics" element={<AcademicAnalytics />} />
                <Route path="term-calendar" element={<TermCalendar />} />
                {/* UNEB Candidate Management */}
                <Route path="uneb-candidates" element={<UNEBCandidates />} />
                {/* Admission Management */}
                <Route path="admission-links" element={<AdmissionLinks />} />
                <Route path="admission-confirmations" element={<AdmissionConfirmations />} />
                {/* Student Lifecycle Management */}
                <Route path="student-lifecycle" element={<StudentLifecycle />} />
                <Route path="promotion-rules" element={<PromotionRules />} />
                <Route path="school-holidays" element={<SchoolHolidays />} />
                {/* Community Hub Routes */}
                <Route path="suggestions" element={<Suggestions />} />
                <Route path="staff-reviews" element={<StaffReviews />} />
                <Route path="notification-settings" element={<NotificationSettings />} />
                <Route path="notification-log" element={<NotificationLog />} />
                <Route path="parent-notification-preferences" element={<ParentNotificationPreferences />} />
                {/* A-Level & NCDC Routes */}
                <Route path="subject-combinations" element={<SubjectCombinations />} />
                <Route path="continuous-assessment" element={<ContinuousAssessment />} />
                {/* Rental Management Routes */}
                <Route path="rental-dashboard" element={<RentalDashboard />} />
                <Route path="rental-tax-dashboard" element={<RentalTaxDashboard />} />
                <Route path="rental-properties" element={<RentalProperties />} />
                <Route path="rental-units" element={<RentalUnits />} />
                <Route path="rental-tenants" element={<RentalTenants />} />
                <Route path="rental-leases" element={<RentalLeases />} />
                <Route path="rental-payments" element={<RentalPayments />} />
                <Route path="rental-maintenance" element={<RentalMaintenance />} />
                <Route path="rental-id-cards" element={<RentalIDCards />} />
                <Route path="rental-payment-proofs" element={<RentalPaymentProofs />} />
                <Route path="rental-expenses" element={<RentalExpenses />} />
                <Route path="rental-recurring-billing" element={<RentalRecurringBilling />} />
                <Route path="rental-financial-reports" element={<RentalFinancialReports />} />
                <Route path="rental-preventative-maintenance" element={<RentalPreventativeMaintenance />} />
                <Route path="rental-messages" element={<RentalMessages />} />
                <Route path="rental-eleasing" element={<RentalELeasing />} />
              </Route>

              {/* Parent Portal Routes */}
              <Route path="/parent" element={<ParentPortal />} />
              <Route path="/parent/dashboard" element={<ParentDashboard />} />

              {/* ECD Parent Portal Routes - Distinct child-friendly design */}
              <Route path="/ecd-parent" element={<ECDParentPortal />} />
              <Route path="/ecd-parent/dashboard" element={<ECDParentDashboard />} />

               {/* Student Portal Routes */}
               <Route path="/student/login" element={<StudentLogin />} />
               <Route path="/student/auth-callback" element={<StudentAuthCallback />} />
               <Route path="/student/set-password" element={<StudentSetPassword />} />
               <Route path="/appeal-discipline/:caseId" element={<AppealDisciplineCase />} />
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="id-card" element={<StudentIDCard />} />
                <Route path="exams" element={<StudentExams />} />
                <Route path="exam-cards" element={<StudentExamCards />} />
                <Route path="performance" element={<StudentPerformance />} />
                <Route path="report-cards" element={<StudentReportCards />} />
                <Route path="timetable" element={<StudentTimetable />} />
                <Route path="fees" element={<StudentFees />} />
                <Route path="events" element={<StudentEvents />} />
                <Route path="resources" element={<StudentResources />} />
                <Route path="curriculum" element={<StudentCurriculum />} />
                <Route path="suggestions" element={<StudentSuggestions />} />
              </Route>

              {/* Renter Portal Routes */}
              <Route path="/renter" element={<RenterPortal />} />
              <Route path="/renter/dashboard" element={<RenterDashboard />} />

              {/* Staff & Teacher Portals */}
              <Route path="/teacher" element={
                <ProtectedStaffRoute allowedRoles={['staff', 'tenant_owner']}>
                  <TeacherLayout />
                </ProtectedStaffRoute>
              }>
                <Route index element={<TeacherDashboard />} />
                <Route path="onboarding" element={<TeacherOnboarding />} />
                <Route path="classes" element={<MyClasses />} />
                <Route path="lesson-plans" element={<LessonPlan />} />
                <Route path="scheme-of-work" element={<SchemeOfWork />} />
                <Route path="lesson-tracker" element={<LessonTracker />} />
                <Route path="attendance" element={<TeacherAttendance />} />
                <Route path="marks" element={<Marks />} />
                <Route path="students" element={<TeacherStudents />} />
                <Route path="student-profiles" element={<SmartDataView />} />
                <Route path="progress" element={<SmartDataView />} />
                <Route path="assignments/create" element={<CreateAssignment />} />
                <Route path="assignments/submissions" element={<SmartDataView />} />
                <Route path="assignments/marking" element={<OnlineMarking />} />
                <Route path="finance" element={<PersonalFinance />} />
                <Route path="communication/parents" element={<SmartDataView />} />
                <Route path="communication/students" element={<SmartDataView />} />
                <Route path="communication/announcements" element={<SmartDataView />} />
                <Route path="reports/performance" element={<PerformanceAnalysis />} />
                <Route path="reports/averages" element={<SubjectAverages />} />
                <Route path="reports/ranking" element={<ClassRanking />} />
                <Route path="reports/attendance" element={<SmartDataView />} />
                <Route path="resources/materials" element={<TeacherResources />} />
                <Route path="resources/past-papers" element={<TeacherResources />} />
                <Route path="resources/curriculum" element={<SmartDataView />} />
                <Route path="resources/calendar" element={<SmartDataView />} />
                <Route path="settings/profile" element={<TeacherProfile />} />
                <Route path="settings/password" element={<TeacherPassword />} />
                <Route path="settings/notifications" element={<SmartDataView />} />
                <Route path="*" element={<SmartDataView />} />
              </Route>
              <Route path="/dos" element={
                <ProtectedStaffRoute allowedRoles={['staff', 'tenant_owner']}>
                  <DOSLayout />
                </ProtectedStaffRoute>
              }>
                <Route index element={<DOSDashboard />} />
                <Route path="academics/subject-allocation" element={<SubjectAllocation />} />
                <Route path="exams/*" element={<ExamManagement />} />
                <Route path="exams/create" element={<CreateExam />} />
                <Route path="exams/result-approval" element={<ResultApproval />} />
                <Route path="exams/promotion" element={<PromotionLists />} />
                <Route path="students/top" element={<TopStudents />} />
                <Route path="students/slow-learners" element={<SlowLearners />} />
                <Route path="reports/exam-analysis" element={<ExamAnalysis />} />
                <Route path="reports/mean-scores" element={<MeanScores />} />
                <Route path="*" element={<SmartDataView />} />
              </Route>
              <Route path="/headteacher" element={
                <ProtectedStaffRoute allowedRoles={['staff', 'tenant_owner']}>
                  <HeadTeacherLayout />
                </ProtectedStaffRoute>
              }>
                <Route index element={<HeadTeacherDashboard />} />
                <Route path="admin/profile" element={<SchoolProfile />} />
                <Route path="admin/staff" element={<StaffManagement />} />
                <Route path="staff/*" element={<StaffManagement />} />
                <Route path="students/admissions" element={<AdmissionsManagement />} />
                <Route path="staff/leave" element={<LeaveManagement />} />
                <Route path="finance/fees" element={<FeesManagement />} />
                <Route path="finance/budget" element={<Budget />} />
                <Route path="academics/performance" element={<AcademicPerformance />} />
                <Route path="*" element={<SmartDataView />} />
              </Route>

              {/* Subscription Expired */}
              <Route path="/subscription-expired" element={<SubscriptionExpired />} />

              {/* Terms and Conditions */}
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

              {/* Public Routes */}
              <Route path="/suggestions" element={<SuggestionBox />} />
              <Route path="/staff-reviews" element={<PublicStaffReviews />} />
              <Route path="/menu/:tenantId" element={<PublicMenu />} />
              <Route path="/menu/:tenantId/:tableId" element={<PublicMenu />} />
              <Route path="/job-status" element={<JobStatus />} />
              <Route path="/submit-payment" element={<SubmitPaymentProof />} />
              <Route path="/public/admission/:linkCode" element={<SelfAdmission />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
