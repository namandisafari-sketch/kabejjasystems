import type { StaffRoleType } from "@/types/school-admin";

export const STAFF_PORTAL_ROUTES: Record<string, string> = {
  head_teacher: "/headteacher",
  deputy_head_admin: "/headteacher",
  deputy_head_academics: "/headteacher",
  director_of_studies: "/dos",
  dean_of_students: "/dos",
  academic_registrar: "/dos",
  head_of_department: "/dos",
  class_teacher: "/teacher",
  subject_teacher: "/teacher",
};

export const STAFF_BUSINESS_ROLES = new Set([
  "bursar", "accountant",
  "admissions_officer",
  "gate_keeper", "transport_officer", "kitchen_staff",
  "store_keeper", "procurement_officer",
  "discipline_master", "hostel_warden",
  "senior_man", "senior_woman",
  "games_master", "games_mistress",
  "boarding_master", "boarding_mistress",
  "patron", "matron",
  "school_nurse", "guidance_counselor",
  "librarian", "lab_technician", "ict_technician",
  "head_of_section",
]);

export const STAFF_WELFARE_ROLES = new Set([
  "guidance_counselor", "school_nurse",
  "discipline_master", "games_master", "games_mistress",
  "boarding_master", "boarding_mistress",
  "matron", "patron", "hostel_warden",
  "senior_man", "senior_woman",
]);

export const STAFF_SUPPORT_ROLES = new Set([
  "librarian", "lab_technician", "ict_technician",
  "gate_keeper", "transport_officer", "kitchen_staff",
  "head_of_section",
]);

export const STAFF_FINANCE_ROLES = new Set([
  "bursar", "accountant",
]);

export function getStaffPortalRoute(staffType: string): string | null {
  return STAFF_PORTAL_ROUTES[staffType] || null;
}

export function isDedicatedPortalRole(staffType: string): boolean {
  return staffType in STAFF_PORTAL_ROUTES;
}

export function getStaffDashboardLabel(staffType: string): string {
  if (STAFF_FINANCE_ROLES.has(staffType)) return "Finance";
  if (STAFF_WELFARE_ROLES.has(staffType)) return "Welfare";
  if (STAFF_SUPPORT_ROLES.has(staffType)) return "Support";
  if (staffType === "admissions_officer") return "Admissions";
  if (staffType === "store_keeper" || staffType === "procurement_officer") return "Store";
  return "Staff";
}
