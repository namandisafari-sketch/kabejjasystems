import { useLocation, useNavigate } from "react-router-dom";
import { DatabaseList, ColumnDef } from "./DatabaseList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, FileText, Users, Calendar, DollarSign, BookOpen, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TableMapping {
  table: string;
  columns: ColumnDef[];
  title: string;
  description?: string;
  orderBy?: { column: string; ascending?: boolean };
  searchFields?: string[];
}

const TABLE_MAP: Record<string, TableMapping> = {
  // Teacher portal tables
  classes: {
    table: "school_classes",
    title: "School Classes",
    description: "All classes and streams in your school",
    columns: [
      { key: "name", label: "Class Name" },
      { key: "level", label: "Level" },
      { key: "section", label: "Stream/Section" },
      { key: "capacity", label: "Capacity" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name", "level", "section"],
  },
  students: {
    table: "students",
    title: "Students",
    description: "All students registered in your school",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "gender", label: "Gender" },
      { key: "class_id", label: "Class ID" },
      { key: "status", label: "Status", render: (v: string) => v ? <Badge>{v}</Badge> : <Badge variant="secondary">Active</Badge> },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  attendance: {
    table: "student_attendance",
    title: "Attendance Records",
    description: "Daily student attendance records",
    columns: [
      { key: "date", label: "Date" },
      { key: "student_id", label: "Student ID" },
      { key: "status", label: "Status", render: (v: string) => {
        const colors: Record<string, string> = { Present: "bg-green-100 text-green-700", Absent: "bg-red-100 text-red-700", Late: "bg-amber-100 text-amber-700", Excused: "bg-blue-100 text-blue-700" };
        return <Badge className={colors[v] || ""}>{v}</Badge>;
      }},
      { key: "notes", label: "Notes" },
    ],
    searchFields: ["student_id", "status", "notes"],
  },
  marks: {
    table: "student_grades",
    title: "Student Marks",
    description: "Continuous assessment and exam scores",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "subject_id", label: "Subject" },
      { key: "assessment_type", label: "Type" },
      { key: "score", label: "Score" },
      { key: "max_score", label: "Max" },
      { key: "grade", label: "Grade", render: (v: string) => v ? <Badge>{v}</Badge> : "-" },
    ],
    searchFields: ["student_id", "subject_id", "assessment_type"],
    orderBy: { column: "created_at", ascending: false },
  },
  subjects: {
    table: "subjects",
    title: "Subjects",
    description: "Academic subjects offered in your school",
    columns: [
      { key: "name", label: "Subject Name" },
      { key: "code", label: "Code" },
      { key: "level", label: "Level" },
      { key: "is_core", label: "Core", render: (v: boolean) => v ? <Badge className="bg-blue-100 text-blue-700">Core</Badge> : <Badge variant="secondary">Elective</Badge> },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge variant="default" className="bg-green-100 text-green-700">Yes</Badge> : <Badge variant="secondary">No</Badge> },
    ],
    searchFields: ["name", "code", "level"],
  },
  teachers: {
    table: "employees",
    title: "Teachers & Staff",
    description: "All teaching and non-teaching staff",
    columns: [
      { key: "full_name", label: "Full Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Department" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "email", "role", "department"],
  },
  staff: {
    table: "employees",
    title: "Staff Management",
    description: "All staff members in your school",
    columns: [
      { key: "full_name", label: "Full Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Dept" },
      { key: "salary", label: "Salary", render: (v: number) => v ? `UGX ${v.toLocaleString()}` : "-" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "email", "role"],
  },
  exams: {
    table: "exams",
    title: "Exams",
    description: "All scheduled examinations",
    columns: [
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "exam_date", label: "Date" },
      { key: "start_time", label: "Start" },
      { key: "duration_minutes", label: "Duration" },
      { key: "max_marks", label: "Max Marks" },
      { key: "status", label: "Status", render: (v: string) => v ? <Badge>{v}</Badge> : "-" },
    ],
    searchFields: ["class_id", "subject_id", "status"],
    orderBy: { column: "exam_date", ascending: true },
  },
  timetable: {
    table: "timetable_entries",
    title: "Timetable",
    description: "Class timetable entries",
    columns: [
      { key: "day_of_week", label: "Day", render: (v: number) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][v] || "-" },
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "teacher_id", label: "Teacher" },
      { key: "room", label: "Room" },
      { key: "period_id", label: "Period" },
    ],
    searchFields: ["class_id", "subject_id", "room"],
  },
  fees: {
    table: "fee_structures",
    title: "Fee Structures",
    description: "School fee structures by level and term",
    columns: [
      { key: "name", label: "Fee Name" },
      { key: "fee_type", label: "Type" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "level", label: "Level" },
      { key: "is_mandatory", label: "Mandatory", render: (v: boolean) => v ? <Badge className="bg-blue-100 text-blue-700">Yes</Badge> : <Badge variant="secondary">No</Badge> },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name", "fee_type", "level"],
  },
  payments: {
    table: "fee_payments",
    title: "Fee Payments",
    description: "Recorded fee payment transactions",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "payment_date", label: "Date" },
      { key: "payment_method", label: "Method" },
      { key: "receipt_number", label: "Receipt No." },
    ],
    searchFields: ["student_id", "receipt_number", "payment_method"],
    orderBy: { column: "payment_date", ascending: false },
  },
  discipline: {
    table: "discipline_cases",
    title: "Discipline Cases",
    description: "Student discipline records",
    columns: [
      { key: "case_number", label: "Case #" },
      { key: "student_id", label: "Student" },
      { key: "incident_type", label: "Type" },
      { key: "incident_date", label: "Date" },
      { key: "status", label: "Status", render: (v: string) => {
        const colors: Record<string, string> = { open: "bg-red-100 text-red-700", resolved: "bg-green-100 text-green-700", appealed: "bg-amber-100 text-amber-700" };
        return <Badge className={colors[v] || ""}>{v}</Badge>;
      }},
      { key: "action_taken", label: "Action" },
    ],
    searchFields: ["case_number", "incident_type", "status"],
    orderBy: { column: "incident_date", ascending: false },
  },
  "report-cards": {
    table: "student_report_cards",
    title: "Report Cards",
    description: "Generated student report cards",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "term_id", label: "Term" },
      { key: "total_marks", label: "Total" },
      { key: "grade", label: "Grade" },
      { key: "rank", label: "Rank" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "created_at", ascending: false },
  },
  departments: {
    table: "academic_departments",
    title: "Academic Departments",
    description: "Department structure within the school",
    columns: [
      { key: "name", label: "Department Name" },
      { key: "code", label: "Code" },
      { key: "hod_id", label: "HOD" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name", "code"],
  },
  "academic-terms": {
    table: "academic_terms",
    title: "Academic Terms",
    description: "School academic term calendar",
    columns: [
      { key: "name", label: "Term Name" },
      { key: "term_number", label: "No." },
      { key: "year", label: "Year" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "is_current", label: "Current", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Current</Badge> : <Badge variant="secondary">Past</Badge> },
    ],
  },
  employees: {
    table: "employees",
    title: "Employees",
    description: "All school employees",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Dept" },
      { key: "salary", label: "Salary", render: (v: number) => v ? `UGX ${v.toLocaleString()}` : "-" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "email", "role"],
  },
  expenses: {
    table: "expenses",
    title: "Expenses",
    description: "School expense records",
    columns: [
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
    ],
    searchFields: ["description", "category"],
    orderBy: { column: "date", ascending: false },
  },
  assets: {
    table: "assets",
    title: "Assets",
    description: "School asset inventory",
    columns: [
      { key: "name", label: "Asset Name" },
      { key: "category", label: "Category" },
      { key: "value", label: "Value", render: (v: number) => v ? `UGX ${(v || 0).toLocaleString()}` : "-" },
      { key: "status", label: "Status" },
      { key: "location", label: "Location" },
    ],
    searchFields: ["name", "category", "location"],
  },
  inventory: {
    table: "inventory_items",
    title: "Inventory",
    description: "School inventory items",
    columns: [
      { key: "name", label: "Item Name" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Qty" },
      { key: "unit_price", label: "Unit Price", render: (v: number) => v ? `UGX ${(v || 0).toLocaleString()}` : "-" },
    ],
    searchFields: ["name", "category"],
  },
  bookings: {
    table: "room_bookings",
    title: "Room Bookings",
    columns: [
      { key: "room_name", label: "Room" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ],
  },
  suppliers: {
    table: "suppliers",
    title: "Suppliers",
    columns: [
      { key: "name", label: "Name" },
      { key: "contact_person", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
    searchFields: ["name", "contact_person"],
  },
  admissions: {
    table: "students",
    title: "Student Admissions",
    description: "Student admission records",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "admission_status", label: "Status", render: (v: string) => {
        const colors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", confirmed: "bg-green-100 text-green-700", enrolled: "bg-blue-100 text-blue-700" };
        return <Badge className={colors[v] || ""}>{v || "Pending"}</Badge>;
      }},
      { key: "class_id", label: "Class" },
      { key: "created_at", label: "Date" },
    ],
    searchFields: ["full_name", "admission_number"],
    orderBy: { column: "created_at", ascending: false },
  },
  payroll: {
    table: "employees",
    title: "Payroll",
    description: "Employee salary information",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "department", label: "Dept" },
      { key: "salary", label: "Salary", render: (v: number) => v ? `UGX ${(v || 0).toLocaleString()}` : "-" },
      { key: "hire_date", label: "Hire Date" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "role"],
  },
  contracts: {
    table: "employees",
    title: "Staff Contracts",
    description: "Staff contract information",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "hire_date", label: "Start Date" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "role"],
  },
  transfers: {
    table: "students",
    title: "Student Transfers",
    description: "Students transferred in or out",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "admission_number", label: "Adm No." },
      { key: "class_id", label: "Current Class" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  promotions: {
    table: "students",
    title: "Student Promotions",
    description: "Student promotion management",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "admission_number", label: "Adm No." },
      { key: "promotion_status", label: "Status" },
      { key: "class_id", label: "Current Class" },
    ],
    searchFields: ["full_name", "promotion_status"],
  },
  medical: {
    table: "students",
    title: "Medical Records",
    description: "Student health and medical information",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "admission_number", label: "Adm No." },
      { key: "blood_group", label: "Blood Group" },
      { key: "allergies", label: "Allergies" },
      { key: "disabilities", label: "Disabilities" },
      { key: "medical_conditions", label: "Medical Conditions" },
    ],
    searchFields: ["full_name", "blood_group", "allergies"],
  },
  buildings: {
    table: "school_buildings",
    title: "School Buildings",
    description: "Building and facility management",
    columns: [
      { key: "name", label: "Building Name" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["name", "type"],
  },
  transport: {
    table: "transport_routes",
    title: "Transport",
    description: "School transport routes and management",
    columns: [
      { key: "route_name", label: "Route" },
      { key: "driver_name", label: "Driver" },
      { key: "capacity", label: "Capacity" },
    ],
    searchFields: ["route_name", "driver_name"],
  },
  library: {
    table: "library_books",
    title: "Library",
    description: "Library book inventory",
    columns: [
      { key: "title", label: "Title" },
      { key: "author", label: "Author" },
      { key: "isbn", label: "ISBN" },
      { key: "quantity", label: "Qty" },
    ],
    searchFields: ["title", "author", "isbn"],
  },
  "lesson-plans": {
    table: "lesson_plans",
    title: "Lesson Plans",
    description: "Teacher lesson plans",
    columns: [
      { key: "title", label: "Title" },
      { key: "subject_id", label: "Subject" },
      { key: "class_id", label: "Class" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", render: (v: string) => {
        const colors: Record<string, string> = { draft: "bg-gray-100 text-gray-700", submitted: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" };
        return <Badge className={colors[v] || ""}>{v || "Draft"}</Badge>;
      }},
    ],
    searchFields: ["title", "subject_id", "status"],
    orderBy: { column: "date", ascending: false },
  },
  "lesson-observation": {
    table: "timetable_entries",
    title: "Lesson Observations",
    description: "Scheduled lesson observations and monitoring",
    columns: [
      { key: "day_of_week", label: "Day", render: (v: number) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][v] || "-" },
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "teacher_id", label: "Teacher" },
      { key: "room", label: "Room" },
    ],
    searchFields: ["class_id", "subject_id", "room"],
  },
  "teacher-allocation": {
    table: "teacher_class_assignments",
    title: "Teacher Allocation",
    description: "Teacher to class/subject assignments",
    columns: [
      { key: "teacher_id", label: "Teacher" },
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["teacher_id", "class_id", "subject_id"],
  },
  "class-allocation": {
    table: "school_classes",
    title: "Class Allocation",
    description: "All classes and streams with teacher assignments",
    columns: [
      { key: "name", label: "Class Name" },
      { key: "level", label: "Level" },
      { key: "section", label: "Stream/Section" },
      { key: "capacity", label: "Capacity" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name", "level", "section"],
  },
  ranking: {
    table: "exam_results",
    title: "Student Rankings",
    description: "Student performance rankings",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "rank", label: "Rank" },
      { key: "grade", label: "Grade" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  grading: {
    table: "exam_types",
    title: "Grading System",
    description: "Exam types and grading criteria",
    columns: [
      { key: "name", label: "Exam Type" },
      { key: "max_score", label: "Max Score" },
      { key: "weight", label: "Weight %" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name"],
  },
  promotion: {
    table: "promotion_decisions",
    title: "Promotion Lists",
    description: "Student promotion decisions",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "from_class_id", label: "From Class" },
      { key: "to_class_id", label: "To Class" },
      { key: "decision", label: "Decision", render: (v: string) => {
        const colors: Record<string, string> = { promote: "bg-green-100 text-green-700", repeat: "bg-red-100 text-red-700", probation: "bg-amber-100 text-amber-700" };
        return <Badge className={colors[v] || ""}>{v}</Badge>;
      }},
      { key: "academic_year", label: "Year" },
    ],
    searchFields: ["student_id", "decision"],
    orderBy: { column: "created_at", ascending: false },
  },
  load: {
    table: "teacher_class_assignments",
    title: "Teaching Load",
    description: "Teacher workload and class assignments",
    columns: [
      { key: "teacher_id", label: "Teacher" },
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
    ],
    searchFields: ["teacher_id"],
  },
  observations: {
    table: "timetable_entries",
    title: "Class Observations",
    description: "Scheduled classroom observations",
    columns: [
      { key: "day_of_week", label: "Day", render: (v: number) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][v] || "-" },
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "teacher_id", label: "Teacher" },
    ],
    searchFields: ["class_id", "subject_id"],
  },
  reviews: {
    table: "employees",
    title: "Performance Reviews",
    description: "Staff performance review records",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "department", label: "Dept" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "role"],
  },
  dev: {
    table: "employees",
    title: "Professional Development",
    description: "Staff training and development records",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "department", label: "Dept" },
    ],
    searchFields: ["full_name", "department"],
  },
  trends: {
    table: "exam_results",
    title: "Performance Trends",
    description: "Student performance trends over time",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "submitted_at", label: "Date" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "submitted_at", ascending: false },
  },
  "slow-learners": {
    table: "students",
    title: "Slow Learners",
    description: "Students requiring additional academic support",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "gender", label: "Gender" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  interventions: {
    table: "students",
    title: "Intervention Tracking",
    description: "Student intervention and support programs",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  remedial: {
    table: "students",
    title: "Remedial Programs",
    description: "Students enrolled in remedial programs",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  assessment: {
    table: "student_grades",
    title: "Continuous Assessment",
    description: "Ongoing student assessment records",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "subject_id", label: "Subject" },
      { key: "assessment_type", label: "Type" },
      { key: "score", label: "Score" },
      { key: "max_score", label: "Max" },
      { key: "grade", label: "Grade" },
    ],
    searchFields: ["student_id", "subject_id", "assessment_type"],
    orderBy: { column: "created_at", ascending: false },
  },
  "exam-analysis": {
    table: "exam_results",
    title: "Exam Analysis",
    description: "Comprehensive examination performance analysis",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "grade", label: "Grade" },
      { key: "submitted_at", label: "Date" },
    ],
    searchFields: ["student_id", "exam_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  "mean-scores": {
    table: "exam_results",
    title: "Mean Scores",
    description: "Average scores by subject and class",
    columns: [
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Mean Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "student_id", label: "Students" },
    ],
    searchFields: ["exam_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  export: {
    table: "exams",
    title: "Export Reports",
    description: "Exported examination reports and documents",
    columns: [
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "exam_date", label: "Date" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["class_id", "subject_id"],
    orderBy: { column: "exam_date", ascending: false },
  },
  notices: {
    table: "announcements",
    title: "Staff Notices",
    description: "Important notices and communications",
    columns: [
      { key: "title", label: "Title" },
      { key: "audience", label: "Audience" },
      { key: "created_at", label: "Date Posted" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Archived</Badge> },
    ],
    searchFields: ["title", "audience"],
    orderBy: { column: "created_at", ascending: false },
  },
  meetings: {
    table: "term_calendar_events",
    title: "Academic Meetings",
    description: "Scheduled academic meetings and events",
    columns: [
      { key: "title", label: "Meeting" },
      { key: "event_date", label: "Date" },
      { key: "event_type", label: "Type" },
      { key: "location", label: "Location" },
    ],
    searchFields: ["title", "event_type"],
    orderBy: { column: "event_date", ascending: true },
  },
  messages: {
    table: "employees",
    title: "Teacher Messaging",
    description: "Internal staff messaging system",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
    ],
    searchFields: ["full_name", "email"],
  },
  "parent-notices": {
    table: "announcements",
    title: "Parent Notices",
    description: "Notices and announcements for parents",
    columns: [
      { key: "title", label: "Title" },
      { key: "audience", label: "Audience" },
      { key: "created_at", label: "Date Posted" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Yes</Badge> : <Badge variant="secondary">No</Badge> },
    ],
    searchFields: ["title"],
    orderBy: { column: "created_at", ascending: false },
  },
  circulars: {
    table: "announcements",
    title: "Circulars",
    description: "Official circulars and administrative notices",
    columns: [
      { key: "title", label: "Title" },
      { key: "audience", label: "Audience" },
      { key: "created_at", label: "Date" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Archived</Badge> },
    ],
    searchFields: ["title", "audience"],
    orderBy: { column: "created_at", ascending: false },
  },
  "exam-papers": {
    table: "exams",
    title: "Exam Papers",
    description: "Examination papers and documents",
    columns: [
      { key: "class_id", label: "Class" },
      { key: "subject_id", label: "Subject" },
      { key: "exam_date", label: "Date" },
      { key: "duration_minutes", label: "Duration" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["class_id", "subject_id"],
    orderBy: { column: "exam_date", ascending: true },
  },
  policies: {
    table: "school_settings",
    title: "Academic Policies",
    description: "School academic policies and guidelines",
    columns: [
      { key: "key", label: "Policy" },
      { key: "value", label: "Value" },
    ],
    searchFields: ["key"],
  },
  documents: {
    table: "school_assets",
    title: "Documents",
    description: "School documents and resources",
    columns: [
      { key: "name", label: "Document" },
      { key: "category", label: "Category" },
    ],
    searchFields: ["name", "category"],
  },
  profile: {
    table: "tenants",
    title: "School Profile",
    description: "School information and settings",
    columns: [
      { key: "name", label: "School Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name", "email"],
  },
  users: {
    table: "profiles",
    title: "User Management",
    description: "System users and their roles",
    columns: [
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["email", "role"],
  },
  roles: {
    table: "staff_permissions",
    title: "Roles & Permissions",
    description: "Staff roles and permission settings",
    columns: [
      { key: "role_name", label: "Role" },
      { key: "permission", label: "Permission" },
      { key: "resource", label: "Resource" },
    ],
    searchFields: ["role_name", "permission"],
  },
  suspensions: {
    table: "students",
    title: "Suspensions",
    description: "Suspended students records",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status", render: (v: string) => <Badge className="bg-red-100 text-red-700">{v || "Suspended"}</Badge> },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  "id-cards": {
    table: "students",
    title: "ID Card Generation",
    description: "Student identification card management",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "gender", label: "Gender" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  files: {
    table: "students",
    title: "Student Files",
    description: "Student document records and files",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  recruitment: {
    table: "employees",
    title: "Recruitment",
    description: "Staff recruitment and hiring",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Position" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "hire_date", label: "Start Date" },
    ],
    searchFields: ["full_name", "email", "role"],
  },
  leave: {
    table: "employees",
    title: "Leave Management",
    description: "Staff leave records and requests",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "email"],
  },
  appraisal: {
    table: "employees",
    title: "Performance Appraisal",
    description: "Staff performance appraisal records",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "department", label: "Dept" },
      { key: "salary", label: "Salary", render: (v: number) => v ? `UGX ${v.toLocaleString()}` : "-" },
    ],
    searchFields: ["full_name", "role"],
  },
  performance: {
    table: "exam_results",
    title: "Academic Performance",
    description: "School-wide academic performance overview",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "grade", label: "Grade" },
      { key: "submitted_at", label: "Date" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  "teacher-performance": {
    table: "employees",
    title: "Teacher Performance",
    description: "Individual teacher performance metrics",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "department", label: "Dept" },
      { key: "email", label: "Email" },
    ],
    searchFields: ["full_name", "department"],
  },
  "exam-reports": {
    table: "exam_results",
    title: "Exam Reports",
    description: "Comprehensive examination reports",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "grade", label: "Grade" },
    ],
    searchFields: ["student_id", "exam_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  inspections: {
    table: "audit_logs",
    title: "Inspection Reports",
    description: "School inspection and audit records",
    columns: [
      { key: "action", label: "Action" },
      { key: "resource", label: "Area" },
      { key: "created_at", label: "Date" },
    ],
    searchFields: ["action", "resource"],
    orderBy: { column: "created_at", ascending: false },
  },
  "school-ranking": {
    table: "exam_results",
    title: "School Ranking",
    description: "School-wide student performance rankings",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "rank", label: "Rank" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  invoices: {
    table: "fee_payments",
    title: "Invoices",
    description: "Student fee invoices and billing",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "payment_date", label: "Date" },
      { key: "receipt_number", label: "Receipt No." },
    ],
    searchFields: ["student_id", "receipt_number"],
    orderBy: { column: "payment_date", ascending: false },
  },
  budget: {
    table: "expenses",
    title: "Budget Overview",
    description: "School budget and expense tracking",
    columns: [
      { key: "description", label: "Item" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
    ],
    searchFields: ["description", "category"],
    orderBy: { column: "date", ascending: false },
  },
  procurement: {
    table: "purchase_orders",
    title: "Procurement",
    description: "School purchase orders and procurement",
    columns: [
      { key: "supplier_id", label: "Supplier" },
      { key: "total_amount", label: "Amount", render: (v: number) => v ? `UGX ${v.toLocaleString()}` : "-" },
      { key: "status", label: "Status" },
      { key: "order_date", label: "Date" },
    ],
    searchFields: ["supplier_id", "status"],
    orderBy: { column: "order_date", ascending: false },
  },
  salaries: {
    table: "employees",
    title: "Salary Reports",
    description: "Employee salary information",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "department", label: "Dept" },
      { key: "salary", label: "Salary", render: (v: number) => v ? `UGX ${v.toLocaleString()}` : "-" },
    ],
    searchFields: ["full_name", "role"],
  },
  reports: {
    table: "expenses",
    title: "Financial Reports",
    description: "School financial reports",
    columns: [
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
    ],
    searchFields: ["description", "category"],
    orderBy: { column: "date", ascending: false },
  },
  maintenance: {
    table: "maintenance_requests",
    title: "Maintenance",
    description: "Facility maintenance requests and tracking",
    columns: [
      { key: "description", label: "Description" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Date" },
    ],
    searchFields: ["description", "status", "priority"],
    orderBy: { column: "created_at", ascending: false },
  },
  hostels: {
    table: "rental_units",
    title: "Hostels",
    description: "School hostel and dormitory management",
    columns: [
      { key: "name", label: "Unit Name" },
      { key: "rent_amount", label: "Fee", render: (v: number) => v ? `UGX ${v.toLocaleString()}` : "-" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["name", "status"],
  },
  labs: {
    table: "school_assets",
    title: "Laboratories",
    description: "School laboratory equipment and resources",
    columns: [
      { key: "name", label: "Equipment" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Qty" },
    ],
    searchFields: ["name", "category"],
  },
  ict: {
    table: "school_assets",
    title: "ICT Equipment",
    description: "Information technology equipment inventory",
    columns: [
      { key: "name", label: "Equipment" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Qty" },
    ],
    searchFields: ["name", "category"],
  },
  sms: {
    table: "employees",
    title: "SMS Communication",
    description: "SMS messaging records",
    columns: [
      { key: "full_name", label: "Recipient" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
    ],
    searchFields: ["full_name", "phone"],
  },
  email: {
    table: "employees",
    title: "Email Communication",
    description: "Email messaging records",
    columns: [
      { key: "full_name", label: "Recipient" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
    ],
    searchFields: ["full_name", "email"],
  },
  "parent-portal": {
    table: "parents",
    title: "Parent Portal",
    description: "Parent portal access and accounts",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "relationship", label: "Relationship" },
    ],
    searchFields: ["full_name", "email"],
  },
  "staff-portal": {
    table: "employees",
    title: "Staff Portal",
    description: "Staff portal access and accounts",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "is_active", label: "Active", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["full_name", "email", "role"],
  },
  financial: {
    table: "expenses",
    title: "Financial Reports",
    description: "School financial performance reports",
    columns: [
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", render: (v: number) => `UGX ${(v || 0).toLocaleString()}` },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
    ],
    searchFields: ["description", "category"],
    orderBy: { column: "date", ascending: false },
  },
  academic: {
    table: "exam_results",
    title: "Academic Reports",
    description: "Comprehensive academic reports",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Exam" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "grade", label: "Grade" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "score_achieved", ascending: false },
  },
  board: {
    table: "students",
    title: "Board Reports",
    description: "Board of governors reports",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Name" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  government: {
    table: "students",
    title: "Government Reports",
    description: "Government-mandated reporting data",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Name" },
      { key: "gender", label: "Gender" },
      { key: "class_id", label: "Class" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  emis: {
    table: "students",
    title: "EMIS Reports",
    description: "Education Management Information System reports",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Name" },
      { key: "gender", label: "Gender" },
      { key: "class_id", label: "Class" },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  "audit-logs": {
    table: "audit_logs",
    title: "Audit Logs",
    description: "System audit and activity logs",
    columns: [
      { key: "action", label: "Action" },
      { key: "resource", label: "Resource" },
      { key: "created_at", label: "Date" },
    ],
    searchFields: ["action", "resource"],
    orderBy: { column: "created_at", ascending: false },
  },
  activity: {
    table: "audit_logs",
    title: "User Activity",
    description: "User activity tracking and monitoring",
    columns: [
      { key: "action", label: "Action" },
      { key: "resource", label: "Resource" },
      { key: "created_at", label: "Date" },
    ],
    searchFields: ["action", "resource"],
    orderBy: { column: "created_at", ascending: false },
  },
  permissions: {
    table: "staff_permissions",
    title: "Permission Management",
    description: "Staff permission and access control",
    columns: [
      { key: "role_name", label: "Role" },
      { key: "permission", label: "Permission" },
      { key: "resource", label: "Resource" },
    ],
    searchFields: ["role_name", "permission"],
  },
  backups: {
    table: "system_backups",
    title: "Backups",
    description: "System backup records",
    columns: [
      { key: "created_at", label: "Date" },
      { key: "status", label: "Status" },
    ],
    orderBy: { column: "created_at", ascending: false },
  },
  "data-recovery": {
    table: "system_backups",
    title: "Data Recovery",
    description: "Data recovery and restoration records",
    columns: [
      { key: "created_at", label: "Date" },
      { key: "status", label: "Status" },
    ],
    orderBy: { column: "created_at", ascending: false },
  },
  progress: {
    table: "student_grades",
    title: "Student Progress",
    description: "Academic progress tracking",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "subject_id", label: "Subject" },
      { key: "assessment_type", label: "Type" },
      { key: "score", label: "Score" },
      { key: "max_score", label: "Max" },
      { key: "grade", label: "Grade" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "created_at", ascending: false },
  },
  "materials": {
    table: "school_assets",
    title: "Teaching Materials",
    description: "Teaching aids and resources",
    columns: [
      { key: "name", label: "Material" },
      { key: "category", label: "Type" },
      { key: "quantity", label: "Qty Available" },
    ],
    searchFields: ["name", "category"],
  },
  "student-profiles": {
    table: "students",
    title: "Student Profiles",
    description: "Detailed student information",
    columns: [
      { key: "admission_number", label: "Adm No." },
      { key: "full_name", label: "Full Name" },
      { key: "gender", label: "Gender" },
      { key: "date_of_birth", label: "Date of Birth" },
      { key: "class_id", label: "Class" },
      { key: "status", label: "Status", render: (v: string) => <Badge>{v || "Active"}</Badge> },
    ],
    searchFields: ["full_name", "admission_number"],
  },
  submissions: {
    table: "exam_results",
    title: "Assignment Submissions",
    description: "Submitted student work",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Assignment" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "-" },
      { key: "submitted_at", label: "Submitted" },
    ],
    searchFields: ["student_id"],
    orderBy: { column: "submitted_at", ascending: false },
  },
  marking: {
    table: "exam_results",
    title: "Online Marking",
    description: "Grade and review submissions",
    columns: [
      { key: "student_id", label: "Student" },
      { key: "exam_id", label: "Assignment" },
      { key: "score_achieved", label: "Score", render: (v: number) => v != null ? `${v}%` : "Pending" },
      { key: "marked_by", label: "Marked By" },
      { key: "remarks", label: "Remarks" },
    ],
    searchFields: ["student_id", "marked_by"],
  },
  parents: {
    table: "parents",
    title: "Parent/Guardian Contacts",
    description: "Contact information for parents and guardians",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "relationship", label: "Relationship" },
    ],
    searchFields: ["full_name", "email", "phone"],
  },
  announcements: {
    table: "announcements",
    title: "Class Announcements",
    description: "Important notices for students and parents",
    columns: [
      { key: "title", label: "Title" },
      { key: "audience", label: "Audience" },
      { key: "created_at", label: "Date Posted" },
      { key: "expires_at", label: "Expires" },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Archived</Badge> },
    ],
    searchFields: ["title", "audience"],
    orderBy: { column: "created_at", ascending: false },
  },
  "past-papers": {
    table: "exam_results",
    title: "Past Papers",
    description: "Previous examination papers",
    columns: [
      { key: "exam_id", label: "Subject/Paper" },
      { key: "score_achieved", label: "Year" },
      { key: "student_id", label: "Prepared By" },
    ],
    searchFields: ["exam_id"],
  },
  curriculum: {
    table: "subjects",
    title: "Curriculum",
    description: "School curriculum and subject overview",
    columns: [
      { key: "name", label: "Subject" },
      { key: "code", label: "Code" },
      { key: "level", label: "Level" },
      { key: "is_core", label: "Type", render: (v: boolean) => v ? <Badge className="bg-blue-100 text-blue-700">Core</Badge> : <Badge variant="secondary">Elective</Badge> },
      { key: "is_active", label: "Status", render: (v: boolean) => v ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    ],
    searchFields: ["name", "code"],
  },
  calendar: {
    table: "term_calendar_events",
    title: "School Calendar",
    description: "Upcoming events and important dates",
    columns: [
      { key: "title", label: "Event" },
      { key: "event_date", label: "Date" },
      { key: "event_type", label: "Type" },
      { key: "location", label: "Location" },
    ],
    searchFields: ["title", "event_type"],
    orderBy: { column: "event_date", ascending: true },
  },
  notifications: {
    table: "parent_notifications",
    title: "Notifications",
    description: "System notifications and alerts",
    columns: [
      { key: "title", label: "Title" },
      { key: "type", label: "Type" },
      { key: "created_at", label: "Date" },
      { key: "is_read", label: "Status", render: (v: boolean) => v ? <Badge variant="secondary">Read</Badge> : <Badge className="bg-blue-100 text-blue-700">New</Badge> },
    ],
    searchFields: ["title", "type"],
    orderBy: { column: "created_at", ascending: false },
  },
};

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  students: Users, teachers: Users, staff: Users, classes: BookOpen,
  fees: DollarSign, payments: DollarSign, finance: DollarSign,
  exams: FileText, timetable: Calendar, attendance: Calendar,
  discipline: Shield, administration: Shield,
};

export function SmartDataView() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const parentPath = "/" + segments.slice(0, Math.max(1, segments.length - 1)).join("/");

  const mapping = TABLE_MAP[lastSegment];

  if (!mapping) {
    const fallbackTitle = lastSegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const Icon = SECTION_ICONS[lastSegment] || Database;

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-xl">{fallbackTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              This module will display data from the database once the feature is configured.
            </p>
            {parentPath !== "/" + lastSegment && (
              <Button variant="outline" className="mt-4" onClick={() => navigate(parentPath)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DatabaseList
      title={mapping.title}
      description={mapping.description}
      table={mapping.table}
      columns={mapping.columns}
      orderBy={mapping.orderBy}
      searchFields={mapping.searchFields}
      emptyMessage={`No ${mapping.title.toLowerCase()} found for your school.`}
    />
  );
}
