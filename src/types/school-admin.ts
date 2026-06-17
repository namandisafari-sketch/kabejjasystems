export type GoverningBodyType = "smc" | "bog" | "school_board" | "proprietorship";

export type GoverningBodyMemberRole =
  | "chairperson" | "vice_chairperson" | "secretary" | "treasurer"
  | "parent_representative" | "teacher_representative" | "community_representative"
  | "local_government_representative" | "founder_representative" | "member"
  | "ex_officio" | "head_teacher";

export type MeetingType = "regular" | "special" | "emergency" | "annual";
export type MeetingStatus = "scheduled" | "ongoing" | "adjourned" | "completed" | "cancelled";

export type StaffRoleType =
  | "head_teacher" | "deputy_head_admin" | "deputy_head_academics"
  | "director_of_studies" | "dean_of_students"
  | "senior_man" | "senior_woman"
  | "head_of_department" | "class_teacher"
  | "games_master" | "games_mistress"
  | "boarding_master" | "boarding_mistress"
  | "patron" | "matron"
  | "school_nurse" | "librarian" | "lab_technician" | "ict_technician"
  | "guidance_counselor" | "head_of_section";

export type InspectionType = "routine" | "follow_up" | "complaint" | "special" | "registration";
export type InspectionStatus = "pending" | "completed" | "actioned" | "closed";

export interface GoverningBody {
  id: string;
  tenant_id: string;
  body_type: GoverningBodyType;
  name: string;
  chairperson_name: string | null;
  chairperson_contact: string | null;
  deputy_chairperson: string | null;
  secretary: string | null;
  treasurer: string | null;
  meeting_frequency: string;
  term_years: number;
  formed_date: string | null;
  status: "active" | "dissolved" | "pending";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoverningBodyMember {
  id: string;
  governing_body_id: string;
  tenant_id: string;
  full_name: string;
  role: GoverningBodyMemberRole;
  phone: string | null;
  email: string | null;
  appointment_date: string;
  expiry_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoverningBodyMeeting {
  id: string;
  governing_body_id: string;
  tenant_id: string;
  meeting_date: string;
  meeting_type: MeetingType;
  agenda: string | null;
  minutes: string | null;
  venue: string | null;
  attendance_count: number | null;
  status: MeetingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicDepartment {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  description: string | null;
  hod_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hod_name?: string;
}

export interface StaffRoleAssignment {
  id: string;
  tenant_id: string;
  employee_id: string;
  role_type: StaffRoleType;
  department_id: string | null;
  class_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  responsibilities: string | null;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  department_name?: string;
  class_name?: string;
}

export interface SchoolInspection {
  id: string;
  tenant_id: string;
  inspection_date: string;
  inspector_name: string;
  inspector_title: string | null;
  inspector_organization: string;
  inspection_type: InspectionType;
  findings: string | null;
  recommendations: string | null;
  action_plan: string | null;
  follow_up_date: string | null;
  status: InspectionStatus;
  report_file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const GOVERNING_BODY_LABELS: Record<GoverningBodyType, string> = {
  smc: "School Management Committee (SMC)",
  bog: "Board of Governors (BoG)",
  school_board: "School Board",
  proprietorship: "Proprietor / Owner",
};

export const STAFF_ROLE_LABELS: Record<StaffRoleType, string> = {
  head_teacher: "Head Teacher / Principal",
  deputy_head_admin: "Deputy Head Teacher (Administration)",
  deputy_head_academics: "Deputy Head Teacher (Academics)",
  director_of_studies: "Director of Studies (DOS)",
  dean_of_students: "Dean of Students",
  senior_man: "Senior Man Teacher",
  senior_woman: "Senior Woman Teacher",
  head_of_department: "Head of Department (HOD)",
  class_teacher: "Class Teacher",
  games_master: "Games Master",
  games_mistress: "Games Mistress",
  boarding_master: "Boarding Master",
  boarding_mistress: "Boarding Mistress",
  patron: "Patron",
  matron: "Matron",
  school_nurse: "School Nurse",
  librarian: "Librarian",
  lab_technician: "Laboratory Technician",
  ict_technician: "ICT Technician",
  guidance_counselor: "Guidance & Counselor",
  head_of_section: "Head of Section",
};

export const MEMBER_ROLE_LABELS: Record<GoverningBodyMemberRole, string> = {
  chairperson: "Chairperson",
  vice_chairperson: "Vice Chairperson",
  secretary: "Secretary",
  treasurer: "Treasurer",
  parent_representative: "Parent Representative",
  teacher_representative: "Teacher Representative",
  community_representative: "Community Representative",
  local_government_representative: "Local Government Representative",
  founder_representative: "Founder Representative",
  member: "Member",
  ex_officio: "Ex-Officio",
  head_teacher: "Head Teacher (Secretary)",
};

// === NCDC NEW CURRICULUM / REPORT CARD ENHANCEMENTS ===

export interface SubjectElement {
  id: string;
  tenant_id: string;
  school_subject_id: string;
  name: string;
  code: string | null;
  description: string | null;
  max_score: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityOfIntegration {
  id: string;
  tenant_id: string;
  school_subject_id: string;
  class_id: string;
  academic_term_id: string;
  chapter_number: number;
  chapter_title: string;
  max_score: number | null;
  weight_percentage: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  subject_name?: string;
  class_name?: string;
  term_name?: string;
}

export interface StudentAoiScore {
  id: string;
  aoi_id: string;
  student_id: string;
  score: number;
  remarks: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export interface ReportCardTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  level: "o-level" | "a-level" | "primary" | "kindergarten";
  layout_config: Record<string, any>;
  scoring_config: Record<string, any>;
  grading_scale: GradingScaleEntry[];
  sections: ReportCardSectionDef[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradingScaleEntry {
  grade: string;
  label: string;
  min: number;
  max: number;
  points?: number;
  color?: string;
}

export interface ReportCardSectionDef {
  section_type: string;
  title: string;
  display_order: number;
  config: Record<string, any>;
  is_visible: boolean;
}

export interface ScoringRule {
  id: string;
  tenant_id: string;
  name: string;
  rule_type: "weighted_average" | "sum_of_scores" | "best_of" | "competency_based" | "custom_formula";
  config: Record<string, any>;
  applicable_levels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportDeliveryConfig {
  id: string;
  tenant_id: string;
  name: string;
  delivery_method: "email" | "sms" | "both";
  format: "pdf" | "csv" | "both";
  conditions: any[];
  schedule: "manual" | "on_publish" | "scheduled";
  send_to_parents: boolean;
  send_to_guardians: boolean;
  allow_preflight: boolean;
  cc_staff_emails: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportDeliveryLog {
  id: string;
  tenant_id: string;
  report_card_id: string | null;
  delivery_config_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  student_name: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}
