import type { Step } from "react-joyride";

export interface TourConfig {
  steps: Step[];
  title: string;
  description: string;
}

const S = {
  welcome(title: string, desc: string): Step {
    return {
      target: "body",
      placement: "center",
      title: `\u2728 ${title}`,
      content: desc,
      disableBeacon: true,
    };
  },
  step(title: string, desc: string): Step {
    return {
      target: "body",
      placement: "center",
      title: `\u25CF ${title}`,
      content: desc,
      disableBeacon: true,
    };
  },
};

const educationTours: Record<string, TourConfig> = {
  "/business/students": {
    title: "Students",
    description: "Manage all student records",
    steps: [
      S.welcome("Students", "The central hub for all student data. Register new students, manage profiles, track enrollment history, and oversee the full student lifecycle from admission to graduation."),
      S.step("Registering a Student", "Click the Add Student button to open the registration form. Fill in personal details, contact info, parent data, and enrollment settings. Required fields are clearly marked."),
      S.step("Finding Records", "Use the search bar to find students by name, admission number, or class. Filter by class, stream, or academic year to narrow results."),
      S.step("Managing Profiles", "Each row has action buttons to view the full profile, edit details, manage fees, track attendance, print ID cards, or deactivate records."),
      S.step("Bulk Import", "Onboard many students at once using the Import feature. Upload a spreadsheet and the system validates and imports all records in one go."),
    ],
  },
  "/business/classes": {
    title: "Classes & Streams",
    description: "Organize academic groups",
    steps: [
      S.welcome("Classes & Streams", "Organize your school into classes and streams. Create academic groups, assign teachers, set capacities, and manage student placements."),
      S.step("Creating a Class", "Click Add Class. Enter the class name, select the teacher in charge, choose the academic term, and set the maximum student capacity."),
      S.step("Viewing Overview", "The class list displays key info at a glance: class name, assigned teacher, current enrollment vs capacity, and the active academic term."),
      S.step("Promoting Students", "At year-end, use Promotions to advance students to the next class. Auto-promote based on configured rules or manually select students."),
    ],
  },
  "/business/attendance": {
    title: "Attendance",
    description: "Track daily attendance",
    steps: [
      S.welcome("Attendance", "Record and monitor daily student attendance efficiently. Mark presence, track patterns, and generate reports."),
      S.step("Marking Attendance", "Pick a class and date. Mark each student as Present, Absent, Late, or Excused. Use Mark All to speed up routine days."),
      S.step("Reports & Insights", "View attendance reports by class, student, or date range. Spot absenteeism patterns early and generate summary reports for parent communication."),
      S.step("Bulk Upload", "For past dates or multiple days, use the Import feature to upload attendance data from a spreadsheet."),
    ],
  },
  "/business/fees": {
    title: "Fee Management",
    description: "Tuition and payment tracking",
    steps: [
      S.welcome("Fee Management", "Complete fee management system. Create fee structures, record payments, track balances, and generate receipts."),
      S.step("Setting Up Fees", "Create fee structures per class and term. Configure tuition, registration, activity fees, and other charges. Set due dates and late payment policies."),
      S.step("Recording Payments", "Log payments as they come in. The system records the date, amount, and method, and generates a receipt automatically."),
      S.step("Monitoring Balances", "See each student's fee status at a glance: paid, partial, or overdue. Send automated reminders to parents with outstanding balances."),
    ],
  },
  "/business/subjects": {
    title: "Subjects",
    description: "Curriculum management",
    steps: [
      S.welcome("Subjects", "Define and manage your school's curriculum. Create subjects, assign them to classes, and set up grading parameters."),
      S.step("Adding Subjects", "Click Add Subject. Enter the subject name, a short code (e.g. MATH, ENG, SCI), and select which classes will study it."),
      S.step("Assigning Teachers", "Each subject can have different teachers per stream. Assign subject teachers directly from the subject list for flexible scheduling."),
    ],
  },
  "/business/exams": {
    title: "Exams",
    description: "Examination management",
    steps: [
      S.welcome("Exams", "Create and manage all school examinations. Schedule exams, manage sessions, and prepare for grading."),
      S.step("Creating an Exam", "Click Create Exam to set up a new examination. Choose the type (Midterm, Final, Quiz, Test), select target classes, and set the date."),
      S.step("Exam Sessions", "Break exams into sessions with specific dates and times. Each session can include multiple subjects and classes for complex exam schedules."),
    ],
  },
  "/business/marks-entry": {
    title: "Marks Entry",
    description: "Record student scores",
    steps: [
      S.welcome("Marks Entry", "Record student scores for exams, assignments, and continuous assessment. Fast, spreadsheet-like data entry."),
      S.step("Entering Marks", "Select the exam session, class, and subject. A student grid appears where you type scores. Use Tab to move between cells for rapid entry."),
      S.step("Auto-Calculation", "Totals, percentages, and grades are calculated automatically based on your configured grading scale. Scores save as you go."),
    ],
  },
  "/business/report-cards": {
    title: "Report Cards",
    description: "Generate student reports",
    steps: [
      S.welcome("Report Cards", "Generate professional, printable report cards with grades, teacher comments, and class rankings."),
      S.step("Generating Reports", "Select the class, term, and exam session, then click Generate Reports. Report cards are created for all students at once."),
      S.step("Printing & Sharing", "Preview before printing. Print individual or batch reports, export as PDF, or share digitally with parents through the parent portal."),
    ],
  },
  "/business/parents": {
    title: "Parents",
    description: "Parent and guardian records",
    steps: [
      S.welcome("Parents", "Manage all parent and guardian information. Keep contact details up to date and link parents to their children."),
      S.step("Adding a Parent", "Click Add Parent and enter their name, phone number, and email. Link them to their enrolled children."),
      S.step("Parent Portal Access", "Linked parents can access the parent portal to view their children's attendance, fee status, grades, and report cards in real time."),
    ],
  },
  "/business/academic-terms": {
    title: "Academic Terms",
    description: "Academic calendar",
    steps: [
      S.welcome("Academic Terms", "Define your school's academic calendar. Create terms with precise start and end dates."),
      S.step("Setting a Term", "Click Add Term. Set the term name (Term 1, 2, 3), start date, and end date. Mark one term as the active term to drive all other modules."),
    ],
  },
  "/business/grades": {
    title: "Grades",
    description: "Grade management",
    steps: [
      S.welcome("Grades", "View and manage student grades across all subjects, exams, and academic terms."),
      S.step("Grade Overview", "See a comprehensive view of student performance. Filter by class, subject, or term to analyze results."),
      S.step("Grade Analytics", "Spot top performers, at-risk students, and class-wide trends to inform teaching decisions."),
    ],
  },
  "/business/discipline-cases": {
    title: "Discipline",
    description: "Behavior tracking",
    steps: [
      S.welcome("Discipline", "Record and track student behavior incidents and disciplinary actions in a structured manner."),
      S.step("Recording Incidents", "Click Record Incident to log a new case. Include incident details, involved students, severity, and action taken."),
      S.step("Case History", "Browse all discipline cases with filters by student, class, date range, or status. Track repeat patterns."),
    ],
  },
  "/business/counseling": {
    title: "Counseling",
    description: "Student counseling records",
    steps: [
      S.welcome("Counseling", "Maintain confidential records of student counseling sessions, assessments, and referrals."),
      S.step("Session Records", "Click New Session to document a counseling session. Record notes, observations, recommendations, and follow-up actions."),
    ],
  },
  "/business/student-lifecycle": {
    title: "Student Lifecycle",
    description: "Transitions & progress",
    steps: [
      S.welcome("Student Lifecycle", "Manage key student transitions: admissions, class promotions, transfers between schools, and graduations."),
      S.step("Recording a Transition", "Click New Transition. Select the student, transition type (promotion, transfer, graduation), and effective date."),
    ],
  },
  "/business/promotion-rules": {
    title: "Promotion Rules",
    description: "Promotion criteria",
    steps: [
      S.welcome("Promotion Rules", "Configure the criteria that determine whether students advance to the next class."),
      S.step("Defining Rules", "Set minimum grade thresholds, attendance percentage requirements, and fee clearance as conditions for promotion."),
    ],
  },
  "/business/uneb-candidates": {
    title: "UNEB Candidates",
    description: "National exam registration",
    steps: [
      S.welcome("UNEB Candidates", "Register and manage students for national examinations (UNEB)."),
      S.step("Registering Candidates", "Select students and register them as exam candidates. Assign examination numbers and subjects."),
      S.step("Candidate Overview", "View all registered candidates with their examination numbers, subjects, and registration status."),
    ],
  },
  "/business/admission-links": {
    title: "Admission Links",
    description: "Online admissions",
    steps: [
      S.welcome("Admission Links", "Generate shareable admission links for prospective parents to apply online."),
      S.step("Creating a Link", "Click Create Link. Choose the intake class and set an expiry date. Share the link with parents via SMS, email, or WhatsApp."),
    ],
  },
  "/business/academic-analytics": {
    title: "Analytics",
    description: "Performance insights",
    steps: [
      S.welcome("Academic Analytics", "Data-driven insights into student performance across subjects, classes, and terms."),
      S.step("Exploring Data", "View charts and tables showing grade distributions, subject performance trends, and class-wide comparisons. Identify strengths and areas for improvement."),
    ],
  },
  "/business/ecd-pupils": {
    title: "ECD Pupils",
    description: "Early Childhood Development",
    steps: [
      S.welcome("ECD Pupils", "Manage pupils in your Early Childhood Development program with age-appropriate tracking."),
      S.step("Adding Pupils", "Click Add Pupil. Enter personal details, parent information, and assign to an ECD class and age group."),
      S.step("Developmental Tracking", "Monitor progress across motor skills, language, cognitive development, and social-emotional growth."),
    ],
  },
  "/business/ecd-progress": {
    title: "ECD Progress",
    description: "Developmental milestones",
    steps: [
      S.welcome("ECD Progress", "Track and record developmental milestones for each ECD pupil."),
      S.step("Recording Progress", "Assess pupils against learning areas. Record observations, achievements, and areas needing support."),
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
    "/business/ecd-learning-activities",
  ];
  return educationPrefixes.some((prefix) => pathname.startsWith(prefix));
}
