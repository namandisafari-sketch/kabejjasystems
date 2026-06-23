// NCDC Competency-Based Curriculum Grading (A-Level & O-Level)
// Uganda National Curriculum Development Centre
// A=5, B=4, C=3, D=2, E=1

export interface NCDCGrade {
  score: number;
  grade: string;
  points: number;
  label: string;
  remark: string;
}

export type AssessmentType = 'formative' | 'summative' | 'project' | 'practical' | 'homework' | 'assignment' | 'mid_term' | 'end_of_term';

export interface ContinuousAssessment {
  id?: string;
  tenant_id: string;
  student_id: string;
  class_id?: string;
  subject_id?: string;
  term_id?: string;
  assessment_type: AssessmentType;
  score: number;
  max_score: number;
  weight: number;
  feedback?: string;
  assessed_at?: string;
}

export interface SubjectCombination {
  id?: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string;
  principal_subjects: string[];
  subsidiary_subjects: string[];
  is_active?: boolean;
}

export function ncdcGrade(score: number, maxScore: number = 100): NCDCGrade {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return { score, grade: 'A', points: 5, label: 'Excellent', remark: 'Outstanding performance' };
  if (pct >= 70) return { score, grade: 'B', points: 4, label: 'Very Good', remark: 'Above average performance' };
  if (pct >= 60) return { score, grade: 'C', points: 3, label: 'Good', remark: 'Satisfactory performance' };
  if (pct >= 50) return { score, grade: 'D', points: 2, label: 'Fair', remark: 'Minimum pass' };
  return { score, grade: 'E', points: 1, label: 'Poor', remark: 'Below expected standard' };
}

export function ncdcGradeColor(grade: string): string {
  const colors: Record<string, string> = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-orange-600', E: 'text-red-600' };
  return colors[grade] || 'text-gray-600';
}

export function ncdcGradeBadgeVariant(grade: string): string {
  const variants: Record<string, string> = { A: 'default', B: 'secondary', C: 'outline', D: 'warning', E: 'destructive' };
  return variants[grade] || 'outline';
}

// Calculate weighted score from multiple assessments
export function calculateWeightedScore(assessments: { score: number; max_score: number; weight: number }[]): number {
  if (assessments.length === 0) return 0;
  const total = assessments.reduce((sum, a) => sum + (a.score / a.max_score) * a.weight, 0);
  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);
  return totalWeight > 0 ? Math.round((total / totalWeight) * 100) : 0;
}

// Determine subject type based on combination
export function getSubjectType(subjectName: string, combination: SubjectCombination): 'principal' | 'subsidiary' | 'core' {
  const lower = subjectName.toLowerCase();
  if (combination.principal_subjects.some(s => s.toLowerCase() === lower)) return 'principal';
  if (combination.subsidiary_subjects.some(s => s.toLowerCase() === lower)) return 'subsidiary';
  if (lower.includes('general paper') || lower.includes('gp') || lower === 'a-gp') return 'core';
  return 'subsidiary';
}

// Common A-Level combinations in Uganda
export const DEFAULT_COMBINATIONS: Omit<SubjectCombination, 'tenant_id'>[] = [
  { name: 'Physics, Chemistry, Mathematics', code: 'PCM', description: 'Physical Sciences pathway', principal_subjects: ['Physics', 'Chemistry', 'Mathematics'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Biology, Chemistry, Mathematics', code: 'BCM', description: 'Biological Sciences pathway', principal_subjects: ['Biology', 'Chemistry', 'Mathematics'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'History, Economics, Geography', code: 'HEG', description: 'Arts & Social Sciences pathway', principal_subjects: ['History', 'Economics', 'Geography'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'History, Economics, Divinity', code: 'HED', description: 'Divinity & Social Sciences pathway', principal_subjects: ['History', 'Economics', 'Divinity'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Mathematics, Economics, Geography', code: 'MEG', description: 'Economics & Geography pathway', principal_subjects: ['Mathematics', 'Economics', 'Geography'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Physics, Chemistry, Biology', code: 'PCB', description: 'Pure Sciences pathway', principal_subjects: ['Physics', 'Chemistry', 'Biology'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Chemistry, Biology, Geography', code: 'CBG', description: 'Geography & Sciences pathway', principal_subjects: ['Chemistry', 'Biology', 'Geography'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Literature, History, Divinity', code: 'LHD', description: 'Languages & Humanities pathway', principal_subjects: ['Literature', 'History', 'Divinity'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'ICT, Mathematics, Economics', code: 'IME', description: 'ICT & Business pathway', principal_subjects: ['ICT', 'Mathematics', 'Economics'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Art, Music, Literature', code: 'AML', description: 'Creative Arts pathway', principal_subjects: ['Art', 'Music', 'Literature'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Divinity, History, IRE', code: 'DHI', description: 'Religious Studies pathway', principal_subjects: ['Divinity', 'History', 'IRE'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Agriculture, Biology, Chemistry', code: 'ABC', description: 'Agricultural Sciences pathway', principal_subjects: ['Agriculture', 'Biology', 'Chemistry'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'French, History, Literature', code: 'FHL', description: 'Languages pathway', principal_subjects: ['French', 'History', 'Literature'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
  { name: 'Economics, Mathematics, Entrepreneurship', code: 'EME', description: 'Business pathway', principal_subjects: ['Economics', 'Mathematics', 'Entrepreneurship'], subsidiary_subjects: ['Subsidiary ICT', 'Subsidiary Mathematics'] },
];

// A-Level default subjects (used when no combination assigned)
export const A_LEVEL_PRINCIPAL_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'Economics', 'Divinity', 'IRE', 'Literature', 'ICT', 'Entrepreneurship', 'Art & Design', 'Music', 'Physical Education', 'French', 'German', 'Arabic', 'Kiswahili', 'Agriculture'];

export const A_LEVEL_SUBSIDIARY_SUBJECTS = ['Subsidiary ICT', 'Subsidiary Mathematics', 'General Paper'];

// O-Level subject grade thresholds for enrollment to next class
export interface SubjectThreshold {
  subject: string;
  minGrade: string;
  minPoints: number;
  isMandatory: boolean;
}

export const DEFAULT_O_LEVEL_THRESHOLDS: SubjectThreshold[] = [
  { subject: 'English', minGrade: 'D', minPoints: 2, isMandatory: true },
  { subject: 'Mathematics', minGrade: 'D', minPoints: 2, isMandatory: true },
  { subject: 'Biology', minGrade: 'D', minPoints: 2, isMandatory: false },
  { subject: 'Chemistry', minGrade: 'D', minPoints: 2, isMandatory: false },
  { subject: 'Physics', minGrade: 'D', minPoints: 2, isMandatory: false },
  { subject: 'Geography', minGrade: 'D', minPoints: 2, isMandatory: false },
  { subject: 'History', minGrade: 'D', minPoints: 2, isMandatory: false },
];

// Check if student meets O-Level subject thresholds
export function checkSubjectThresholds(
  studentGrades: { subject: string; grade: string; points: number }[],
  thresholds: SubjectThreshold[]
): { passed: boolean; failures: { subject: string; reason: string }[] } {
  const failures: { subject: string; reason: string }[] = [];

  for (const threshold of thresholds) {
    const gradeRecord = studentGrades.find(
      g => g.subject.toLowerCase() === threshold.subject.toLowerCase()
    );

    if (!gradeRecord) {
      failures.push({ subject: threshold.subject, reason: `No grade found for ${threshold.subject}` });
      continue;
    }

    if (gradeRecord.points < threshold.minPoints) {
      failures.push({
        subject: threshold.subject,
        reason: `${threshold.subject}: grade ${gradeRecord.grade} (${gradeRecord.points} pts) below minimum ${threshold.minGrade} (${threshold.minPoints} pts)`,
      });
    }
  }

  // For non-mandatory subjects, only fail if student was enrolled in them
  const relevantFailures = failures.filter(f =>
    thresholds.find(t => t.subject === f.subject && t.isMandatory)
  );

  return { passed: relevantFailures.length === 0, failures: relevantFailures };
}

// Uganda UACE points calculation (A=5, B=4, C=3, D=2, E=1, best 3 principal)
export function calculateUACEPoints(subjects: { grade: string; type: 'principal' | 'subsidiary' }[]): number {
  const gradeToPoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const principalPoints = subjects
    .filter(s => s.type === 'principal')
    .map(s => gradeToPoints[s.grade] || 0)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const subsidiaryBonus = subjects
    .filter(s => s.type === 'subsidiary')
    .reduce((sum, s) => sum + Math.max(0, (gradeToPoints[s.grade] || 0) - 1), 0);
  return principalPoints.reduce((sum, p) => sum + p, 0) + Math.floor(subsidiaryBonus / 3);
}
