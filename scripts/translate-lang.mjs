// Translation generator for Fasiri African Language API
// Usage: node scripts/translate-lang.mjs <target_lang> [output_file]
//   target_lang: language code (lug, ach, nyn, xog, teo, lgg)
//   output_file: optional output path (default: src/i18n/translations/<lang>.ts)

const FASIRI_BASE_URL = "https://fasiri-bu9u.onrender.com";

// English source translations (mirrors src/i18n/translations/en.ts)
const en = {
  common: {
    save: "Save", cancel: "Cancel", add: "Add", edit: "Edit",
    delete: "Delete", search: "Search...", loading: "Loading...",
    noResults: "No results found", active: "Active", inactive: "Inactive",
    total: "Total", actions: "Actions", confirm: "Confirm", back: "Back",
    next: "Next", submit: "Submit", close: "Close", yes: "Yes", no: "No",
    all: "All", filter: "Filter", export: "Export", import: "Import",
    print: "Print", download: "Download", upload: "Upload", refresh: "Refresh",
    view: "View", details: "Details", status: "Status", date: "Date",
    name: "Name", email: "Email", phone: "Phone", address: "Address",
    notes: "Notes", description: "Description", amount: "Amount",
    quantity: "Quantity", price: "Price", type: "Type", category: "Category",
    error: "Error", success: "Success", warning: "Warning", members: "members",
  },
  auth: {
    login: "Login", logout: "Logout", signup: "Sign Up", email: "Email",
    password: "Password", forgotPassword: "Forgot Password?",
    rememberMe: "Remember me", noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
  },
  nav: {
    dashboard: "Dashboard", students: "Students", classes: "Classes",
    subjects: "Subjects", attendance: "Attendance", fees: "Fees",
    exams: "Exams", examSessions: "Exam Sessions", reportCards: "Report Cards",
    grades: "Grades", parents: "Parents", employees: "Staff",
    payroll: "Payroll", timetable: "Timetable", discipline: "Discipline",
    settings: "Settings", reports: "Reports", gateCheckin: "Gate Check-in",
    visitorRegister: "Visitor Register", termCalendar: "Term Calendar",
    admissionLinks: "Admission Links", admissionConfirmations: "Admission Confirmations",
    unebRegistration: "UNEB Registration", unebCandidates: "UNEB Candidates",
    navigation: "Navigation", managementPortal: "Management Portal",
    pos: "POS", products: "Products", sales: "Sales", customers: "Customers",
    expenses: "Expenses", inventory: "Inventory", assets: "Assets",
    letters: "Letters", accounting: "Accounting", requisitions: "Requisitions",
    studentCards: "Student Cards", schoolHolidays: "School Holidays",
    termRequirements: "Term Requirements", studentLifecycle: "Student Lifecycle",
    promotionRules: "Promotion Rules", marksEntry: "Marks Entry",
    importExamResults: "Import Exam Results",
    examImportPermissions: "Exam Import Permissions",
    blockedExamAccess: "Blocked Exam Access",
    academicAnalytics: "Academic Analytics", branches: "Branches",
    qrCodes: "QR Codes", businessCards: "Business Cards",
  },
  dashboard: {
    title: "Dashboard", welcome: "Welcome back", overview: "Overview",
    totalStudents: "Total Students", totalStaff: "Total Staff",
    totalRevenue: "Total Revenue", totalExpenses: "Total Expenses",
    recentActivity: "Recent Activity", quickActions: "Quick Actions",
    feesCollected: "Fees Collected", feesOutstanding: "Fees Outstanding",
    attendanceRate: "Attendance Rate", enrollmentTrend: "Enrollment Trend",
  },
  students: {
    title: "Students", addStudent: "Add Student", editStudent: "Edit Student",
    studentDetails: "Student Details", fullName: "Full Name",
    admissionNumber: "Admission Number", class: "Class", gender: "Gender",
    dateOfBirth: "Date of Birth", parentName: "Parent/Guardian Name",
    parentPhone: "Parent Phone", enrollmentDate: "Enrollment Date",
    male: "Male", female: "Female", totalStudents: "Total Students",
    activeStudents: "Active Students",
  },
  staff: {
    title: "Staff", addStaff: "Add Staff Member", editStaff: "Edit Staff",
    fullName: "Full Name", role: "Role", department: "Department",
    salary: "Salary", hireDate: "Hire Date", active: "Active",
    payroll: "Payroll", activate: "Activate", deactivate: "Deactivate",
    totalStaff: "Total", activeStaff: "Active", totalPayroll: "Payroll",
    noStaffFound: "No staff found",
  },
  fees: {
    title: "Fees", collectPayment: "Collect Payment",
    feeStructure: "Fee Structure", paymentHistory: "Payment History",
    balance: "Balance", paid: "Paid", pending: "Pending", overdue: "Overdue",
    paymentMethod: "Payment Method", cash: "Cash",
    bankTransfer: "Bank Transfer", mobileMoney: "Mobile Money",
    receipt: "Receipt", totalCollected: "Total Collected",
    totalOutstanding: "Total Outstanding",
  },
  exams: {
    title: "Exams", createExam: "Create Exam", examName: "Exam Name",
    subject: "Subject", marks: "Marks", grade: "Grade",
    totalMarks: "Total Marks", passMark: "Pass Mark", results: "Results",
    average: "Average",
  },
  attendance: {
    title: "Attendance", markAttendance: "Mark Attendance",
    present: "Present", absent: "Absent", late: "Late", excused: "Excused",
    attendanceRate: "Attendance Rate", today: "Today", thisWeek: "This Week",
    thisMonth: "This Month",
  },
  classes: {
    title: "Classes", addClass: "Add Class", className: "Class Name",
    classTeacher: "Class Teacher", totalStudents: "Total Students",
    stream: "Stream", section: "Section",
  },
  settings: {
    title: "Settings", general: "General", school: "School Settings",
    billing: "Billing", users: "Users", security: "Security",
    notifications: "Notifications", language: "Language",
    selectLanguage: "Select Language", english: "English",
    arabic: "العربية",
  },
  reports: {
    title: "Reports", generate: "Generate Report",
    financialReport: "Financial Report", academicReport: "Academic Report",
    attendanceReport: "Attendance Report", staffReport: "Staff Report",
  },
  parents: {
    title: "Parents", addParent: "Add Parent", parentName: "Parent Name",
    children: "Children", contactInfo: "Contact Information",
  },
  discipline: {
    title: "Discipline", addCase: "Report Incident",
    caseNumber: "Case Number", incidentDate: "Incident Date",
    incidentType: "Incident Type", actionTaken: "Action Taken",
    resolved: "Resolved", pending: "Pending",
  },
  counseling: {
    title: "Guidance & Counseling", newSession: "New Session",
    sessionNumber: "Session #", counselor: "Counselor",
    issueCategory: "Issue Category", sessionType: "Session Type",
    activeCases: "Active Cases", resolved: "Resolved", referred: "Referred",
  },
  timetable: {
    title: "Timetable", monday: "Monday", tuesday: "Tuesday",
    wednesday: "Wednesday", thursday: "Thursday", friday: "Friday",
    saturday: "Saturday", period: "Period", break: "Break",
  },
  gate: {
    title: "Gate Check-in", scanQR: "Scan QR Code", checkIn: "Check In",
    checkOut: "Check Out", visitor: "Visitor", student: "Student",
  },
  ecd: {
    pupils: "Pupils", learningAreas: "Learning Areas", progress: "Progress",
    roles: "Class Roles", pupilCards: "Pupil Cards",
  },
};

// Language display names (these stay untranslated since they label the language itself)
const languageLabels = {
  lug: "Luganda", ach: "Acholi", nyn: "Runyankore",
  xog: "Lusoga", teo: "Ateso", lgg: "Lugbara",
};

// Recursively collect all leaf string values with their paths
function collectPaths(obj, prefix = "") {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      paths.push(...collectPaths(value, path));
    } else if (typeof value === "string") {
      paths.push({ path, key, value });
    }
  }
  return paths;
}

// Reconstruct object from translated leaf values
function reconstruct(obj, translations, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      result[key] = reconstruct(value, translations, path);
    } else if (typeof value === "string") {
      result[key] = translations[path] ?? value;
    }
  }
  return result;
}

async function translateText(apiKey, text, targetLang) {
  if (!text || text.trim() === "") return text;

  const response = await fetch(`${FASIRI_BASE_URL}/api/v1/translate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_lang: targetLang,
      source_lang: "en",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Fasiri API error (${response.status}): ${body || response.statusText}`);
  }

  const data = await response.json();
  return data.translated_text;
}

// Escape a string for use as a TypeScript string literal value
function escapeTs(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

// Format an object as a TypeScript const export (with 2-space indent)
function formatTs(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);
  const entries = Object.entries(obj);
  const isSimple = entries.every(([, v]) => typeof v === "string");

  if (isSimple) {
    const items = entries
      .map(([k, v]) => `${padInner}${k}: \`${escapeTs(v)}\`,`)
      .join("\n");
    return `{\n${items}\n${pad}}`;
  }

  const items = entries
    .map(([k, v]) => {
      if (typeof v === "string") {
        return `${padInner}${k}: \`${escapeTs(v)}\`,`;
      }
      return `${padInner}${k}: ${formatTs(v, indent + 1)},`;
    })
    .join("\n");
  return `{\n${items}\n${pad}}`;
}

async function generate() {
  const targetLang = process.argv[2];
  const outputFile = process.argv[3];

  if (!targetLang) {
    console.error("Usage: node scripts/translate-lang.mjs <lang_code> [output_file]");
    console.error("  lang_code: lug, ach, nyn, xog, teo, lgg");
    process.exit(1);
  }

  const apiKey = process.env.VITE_FASIRI_API_KEY;
  if (!apiKey) {
    console.error("Error: VITE_FASIRI_API_KEY environment variable not set");
    process.exit(1);
  }

  const langLabel = languageLabels[targetLang] || targetLang.toUpperCase();
  const outputPath = outputFile || `src/i18n/translations/${targetLang}.ts`;

  console.log(`\nGenerating ${langLabel} (${targetLang}) translations...`);
  console.log(`Output: ${outputPath}\n`);

  // Collect all strings to translate
  const paths = collectPaths(en);
  console.log(`Found ${paths.length} strings to translate\n`);

  // Translate each string
  const translations = {};
  let completed = 0;
  const errors = [];

  // Process in parallel batches of 5 to avoid overwhelming the API
  const BATCH_SIZE = 5;
  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ path, value }) =>
        translateText(apiKey, value, targetLang)
          .then((translated) => ({ path, translated }))
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        translations[result.value.path] = result.value.translated;
      } else {
        const failedPath = batch[results.indexOf(result)]?.path || "unknown";
        errors.push(`${failedPath}: ${result.reason?.message || result.reason}`);
        translations[failedPath] = en._fallback || "";
      }
    }

    completed += batch.length;
    const pct = ((completed / paths.length) * 100).toFixed(1);
    const okCount = Object.keys(translations).length - errors.length;
    process.stdout.write(`\r  Progress: ${completed}/${paths.length} (${pct}%) - ${okCount} OK`);
  }

  console.log("\n");

  if (errors.length > 0) {
    console.warn(`  ${errors.length} translation(s) failed:\n`);
    for (const err of errors.slice(0, 10)) {
      console.warn(`    - ${err}`);
    }
    if (errors.length > 10) {
      console.warn(`    ... and ${errors.length - 10} more`);
    }
    console.log("");
  }

  // Fall back to English for any untranslated strings
  for (const { path, value } of paths) {
    if (!translations[path]) {
      translations[path] = value;
    }
  }

  // Reconstruct the full object
  const translated = reconstruct(en, translations);

  // Ensure language display names in settings are correct (never translate these)
  translated.settings ||= {};
  translated.settings.english = "English";
  translated.settings.arabic = "العربية";
  translated.settings.luganda = "Luganda";

  // Write the output file
  const fs = await import("fs");
  const tsContent = `import type { TranslationKeys } from "./en";\n\nexport const ${targetLang}: TranslationKeys = ${formatTs(translated, 0)};\n`;

  fs.mkdirSync("src/i18n/translations", { recursive: true });
  fs.writeFileSync(outputPath, tsContent, "utf-8");

  console.log(`\nDone! Generated ${outputPath}`);
  console.log(`  ${paths.length} strings translated to ${langLabel}\n`);
}

generate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
