import type { Step } from "react-joyride";

export interface TourConfig {
  steps: Step[];
  title: string;
  description: string;
}

const educationTours: Record<string, TourConfig> = {
  "/business/students": {
    title: "Students Management",
    description: "Manage all student records",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Students",
        content: "This is your central hub for managing all student records. You can register new students, view profiles, track enrollment, and manage student information all in one place.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "📝 Adding Students",
        content: "Click the 'Add Student' button to register a new student. Fill in their personal details, contact information, parent/guardian details, and enrollment information. Required fields are marked with an asterisk.",
      },
      {
        target: "body",
        placement: "center",
        title: "🔍 Finding Students",
        content: "Use the search bar to quickly find students by name, admission number, or class. You can also filter by class, stream, or academic year using the dropdown filters above the table.",
      },
      {
        target: "body",
        placement: "center",
        title: "📋 Student Records",
        content: "The data table shows all registered students. Click on any row to view the full student profile. Use the action buttons to edit details, manage fees, view attendance, print ID cards, or deactivate records.",
      },
      {
        target: "body",
        placement: "center",
        title: "📤 Import Students",
        content: "Need to add many students at once? Use the Import feature to upload a spreadsheet with student data. The system will validate and import records in bulk, saving you time.",
      },
    ],
  },

  "/business/classes": {
    title: "Classes & Streams",
    description: "Organize classes and academic groups",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Classes",
        content: "Manage your school's classes, streams, and academic groups. Create classes, assign teachers, set capacities, and organize students into the right groups.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "➕ Creating Classes",
        content: "Click 'Add Class' to create a new class or stream. Set the class name, select the teacher in charge, choose the academic term, and define the maximum student capacity.",
      },
      {
        target: "body",
        placement: "center",
        title: "📊 Class Overview",
        content: "The class list shows all classes with key information: class name, assigned teacher, current number of students vs capacity, and the active academic term.",
      },
      {
        target: "body",
        placement: "center",
        title: "🔄 Promotions",
        content: "At the end of each academic year, use the promotion tools to move students to the next class. The system can auto-promote based on configured rules.",
      },
    ],
  },

  "/business/attendance": {
    title: "Attendance Tracking",
    description: "Record daily student attendance",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Attendance",
        content: "Record and monitor student attendance with ease. Mark daily attendance, view reports, track patterns, and identify students who need attention.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "✅ Marking Attendance",
        content: "Select a class and date to begin. Mark each student as Present (P), Absent (A), Late (L), or Excused (E). Use the 'Mark All' option to speed up the process.",
      },
      {
        target: "body",
        placement: "center",
        title: "📈 Attendance Reports",
        content: "View attendance reports by class, student, or date range. Track attendance percentages, identify patterns of absenteeism, and generate reports for parents.",
      },
      {
        target: "body",
        placement: "center",
        title: "📤 Bulk Import",
        content: "Need to record attendance for multiple days? Use the import feature to upload attendance data from a spreadsheet, saving time on manual data entry.",
      },
    ],
  },

  "/business/fees": {
    title: "Fee Management",
    description: "Manage tuition and payments",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Fees",
        content: "Manage all fee-related activities. Create fee structures, track payments, send reminders, and monitor outstanding balances for every student.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "💰 Setting Up Fees",
        content: "Create fee structures for each class and term. Set tuition amounts, registration fees, activity fees, and other charges. Define payment deadlines and late fee policies.",
      },
      {
        target: "body",
        placement: "center",
        title: "💳 Recording Payments",
        content: "Record payments received from parents. The system tracks payment dates, amounts, payment methods, and generates receipts automatically.",
      },
      {
        target: "body",
        placement: "center",
        title: "📊 Balance Tracking",
        content: "View the fee status for each student - paid, partially paid, or outstanding. Send automated reminders to parents with overdue balances.",
      },
    ],
  },

  "/business/subjects": {
    title: "Subjects",
    description: "Manage curriculum subjects",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Subjects",
        content: "Define and organize the subjects offered at your school. Create subjects, assign them to classes, and set up grading parameters.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "➕ Adding Subjects",
        content: "Click 'Add Subject' to create a new subject. Enter the subject name, code (e.g., MATH, ENG, SCI), and select which classes will study this subject.",
      },
      {
        target: "body",
        placement: "center",
        title: "📚 Subject Allocation",
        content: "Assign subjects to specific classes and teachers. Each subject can have different teachers for different streams, making scheduling flexible.",
      },
    ],
  },

  "/business/exams": {
    title: "Exams",
    description: "Create and manage examinations",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Exams",
        content: "Create and manage school examinations. Set up exam schedules, manage sessions, and prepare for grading all from one place.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "📝 Creating Exams",
        content: "Click 'Create Exam' to set up a new examination. Choose the exam type (Midterm, Final, Quiz, Test), select classes, and set the date.",
      },
      {
        target: "body",
        placement: "center",
        title: "📅 Exam Sessions",
        content: "Organize exams into sessions with specific dates and times. Each session can include multiple subjects and classes.",
      },
    ],
  },

  "/business/marks-entry": {
    title: "Marks Entry",
    description: "Record student scores",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Marks Entry",
        content: "Record student scores for exams, assignments, and continuous assessment. Enter marks subject by subject and class by class.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "📊 Entering Marks",
        content: "Select the exam session, class, and subject. The system shows a grid of students where you can enter scores. Tab between cells for fast data entry.",
      },
      {
        target: "body",
        placement: "center",
        title: "✅ Auto-Calculation",
        content: "The system automatically calculates totals, percentages, and grades based on your configured grading scale. Scores are saved as you go.",
      },
    ],
  },

  "/business/report-cards": {
    title: "Report Cards",
    description: "Generate student report cards",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Report Cards",
        content: "Generate professional report cards for students. Include grades, subject performance, teacher comments, and class rankings.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "📄 Generating Reports",
        content: "Select the class, term, and exam session, then click 'Generate Reports'. The system creates report cards for all students in that class at once.",
      },
      {
        target: "body",
        placement: "center",
        title: "🖨️ Printing & Sharing",
        content: "Preview report cards before printing. You can print individual or batch reports, export as PDF, and share digitally with parents through the parent portal.",
      },
    ],
  },

  "/business/timetable": {
    title: "Timetable",
    description: "Class scheduling",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Timetable",
        content: "Create and manage class timetables. Design weekly schedules for each class or stream with subject assignments and teacher allocations.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "📅 Building Your Timetable",
        content: "Select a class and academic term. Drag and drop subjects into time slots to build the weekly schedule. The system prevents double-booking of teachers.",
      },
    ],
  },

  "/business/parents": {
    title: "Parents",
    description: "Manage parent/guardian records",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Parents",
        content: "Manage parent and guardian information. Keep contact details, link parents to students, and communicate through the platform.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "👤 Adding Parents",
        content: "Register a new parent by clicking 'Add Parent'. Enter their name, phone number, email, and link them to their children in the school.",
      },
      {
        target: "body",
        placement: "center",
        title: "🔗 Parent-Student Links",
        content: "Each parent can be linked to multiple students. This enables parents to access their children's attendance, fees, grades, and report cards through the parent portal.",
      },
    ],
  },

  "/business/academic-terms": {
    title: "Academic Terms",
    description: "Define academic periods",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to Academic Terms",
        content: "Define the academic calendar for your school. Create terms with start and end dates, and manage term-based activities like fees and exams.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "📅 Setting Terms",
        content: "Click 'Add Term' to create a new academic term. Set the term name (Term 1, Term 2, Term 3), start date, and end date. Mark one term as the active term.",
      },
    ],
  },

  "/business/ecd-pupils": {
    title: "ECD Pupils",
    description: "Early Childhood Development",
    steps: [
      {
        target: "body",
        placement: "center",
        title: "👋 Welcome to ECD Pupils",
        content: "Manage pupils in your Early Childhood Development program. Track developmental progress, attendance, and learning activities for young learners.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "👶 Adding Pupils",
        content: "Register new ECD pupils by clicking 'Add Pupil'. Enter their personal details, parent information, and assign them to an ECD class and age group.",
      },
      {
        target: "body",
        placement: "center",
        title: "📈 Tracking Progress",
        content: "Monitor each pupil's developmental progress across learning areas including motor skills, language, cognitive development, and social-emotional growth.",
      },
    ],
  },
};

export function getTourForPath(pathname: string): TourConfig | null {
  const sortedKeys = Object.keys(educationTours).sort(
    (a, b) => b.length - a.length
  );
  for (const key of sortedKeys) {
    if (pathname.startsWith(key)) {
      return educationTours[key];
    }
  }
  return null;
}

export function isEducationRoute(pathname: string): boolean {
  const educationPrefixes = [
    "/business/students",
    "/business/classes",
    "/business/attendance",
    "/business/fees",
    "/business/subjects",
    "/business/exam",
    "/business/marks-entry",
    "/business/report-cards",
    "/business/grades",
    "/business/timetable",
    "/business/parents",
    "/business/academic-terms",
    "/business/discipline-cases",
    "/business/counseling",
    "/business/student-lifecycle",
    "/business/promotion-rules",
    "/business/uneb-candidates",
    "/business/admission-links",
    "/business/admission-confirmations",
    "/business/academic-analytics",
    "/business/term-calendar",
    "/business/term-requirements",
    "/business/school-holidays",
    "/business/student-cards",
    "/business/ecd-pupils",
    "/business/ecd-progress",
    "/business/ecd-roles",
    "/business/ecd-learning-areas",
    "/business/ecd-marks-entry",
    "/business/ecd-pupil-cards",
  ];
  return educationPrefixes.some((prefix) => pathname.startsWith(prefix));
}
