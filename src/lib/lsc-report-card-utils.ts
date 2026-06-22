/**
 * LSC (Lower Secondary Curriculum) Report Card Utilities
 * Following Uganda NCDC (National Curriculum Development Centre) Standards
 * 
 * This module provides templates, grading scales, and configuration
 * for generating LSC-compliant report cards.
 */

export interface LSCGradingScale {
  grade: string;
  minScore: number;
  maxScore: number;
  description: string;
  color: string;
}

export interface LSCSubject {
  code: string;
  name: string;
  category: 'language' | 'mathematics' | 'science' | 'social_studies' | 'technical' | 'other';
  maxScore: number;
}

export interface LSCCompetency {
  code: string;
  name: string;
  description: string;
}

export interface LSCReportCardConfig {
  schoolName: string;
  schoolCode?: string;
  schoolMotto?: string;
  reportLevel: 'lower-secondary' | 'upper-secondary';
  subjects: LSCSubject[];
  gradingScale: LSCGradingScale[];
  competencies: LSCCompetency[];
  sections: {
    showAcademicResults: boolean;
    showCompetencies: boolean;
    showBehaviour: boolean;
    showTeacherRemarks: boolean;
    showPromotionStatus: boolean;
    showParentSignature: boolean;
  };
}

// Uganda NCDC Standard Grading Scale (1-9 system commonly used)
export const LSC_GRADING_SCALE: LSCGradingScale[] = [
  { grade: '1', minScore: 90, maxScore: 100, description: 'Excellent', color: '#059669' },
  { grade: '2', minScore: 80, maxScore: 89, description: 'Very Good', color: '#10b981' },
  { grade: '3', minScore: 70, maxScore: 79, description: 'Good', color: '#34d399' },
  { grade: '4', minScore: 60, maxScore: 69, description: 'Above Average', color: '#fbbf24' },
  { grade: '5', minScore: 50, maxScore: 59, description: 'Average', color: '#f59e0b' },
  { grade: '6', minScore: 40, maxScore: 49, description: 'Below Average', color: '#f97316' },
  { grade: '7', minScore: 30, maxScore: 39, description: 'Poor', color: '#ef4444' },
  { grade: '8', minScore: 20, maxScore: 29, description: 'Very Poor', color: '#dc2626' },
  { grade: '9', minScore: 0, maxScore: 19, description: 'Fail', color: '#991b1b' },
];

// Standard LSC Subjects (Uganda NCDC Lower Secondary)
export const LSC_STANDARD_SUBJECTS: LSCSubject[] = [
  // Languages
  { code: 'ENG', name: 'English Language', category: 'language', maxScore: 100 },
  { code: 'LAN', name: 'Local Language', category: 'language', maxScore: 100 },
  
  // Mathematics and Sciences
  { code: 'MAT', name: 'Mathematics', category: 'mathematics', maxScore: 100 },
  { code: 'SCI', name: 'Integrated Science', category: 'science', maxScore: 100 },
  
  // Social Studies
  { code: 'SST', name: 'Social Studies', category: 'social_studies', maxScore: 100 },
  { code: 'RVE', name: 'Religious and Moral Education', category: 'social_studies', maxScore: 100 },
  
  // Technical/Vocational
  { code: 'AGR', name: 'Agriculture', category: 'technical', maxScore: 100 },
  { code: 'TEK', name: 'Technical Drawing/Woodwork', category: 'technical', maxScore: 100 },
  { code: 'HEC', name: 'Home Economics', category: 'technical', maxScore: 100 },
  
  // Other
  { code: 'PE', name: 'Physical Education', category: 'other', maxScore: 100 },
  { code: 'ART', name: 'Art and Design', category: 'other', maxScore: 100 },
  { code: 'MUS', name: 'Music', category: 'other', maxScore: 100 },
];

// LSC Competencies (from NCDC Framework)
export const LSC_COMPETENCIES: LSCCompetency[] = [
  { code: 'PS', name: 'Problem Solving', description: 'Ability to analyze and solve problems' },
  { code: 'CC', name: 'Communication', description: 'Ability to communicate ideas clearly' },
  { code: 'CW', name: 'Collaboration/Teamwork', description: 'Ability to work effectively with others' },
  { code: 'CP', name: 'Critical Thinking', description: 'Ability to think critically and reflectively' },
  { code: 'CD', name: 'Creativity/Innovation', description: 'Ability to think creatively and innovate' },
  { code: 'LM', name: 'Learning to Learn', description: 'Ability to engage in lifelong learning' },
];

// Behaviour Rating Scale
export const BEHAVIOUR_RATINGS = [
  { code: 'E', label: 'Excellent', description: 'Exemplary behaviour and conduct' },
  { code: 'VG', label: 'Very Good', description: 'Good behaviour with minor issues' },
  { code: 'G', label: 'Good', description: 'Satisfactory behaviour' },
  { code: 'S', label: 'Satisfactory', description: 'Acceptable behaviour' },
  { code: 'U', label: 'Unsatisfactory', description: 'Needs improvement' },
];

/**
 * Get grade from score using LSC grading scale
 */
export function getGradeFromScore(score: number): string {
  const scale = LSC_GRADING_SCALE.find(g => score >= g.minScore && score <= g.maxScore);
  return scale?.grade || '9';
}

/**
 * Get grade description from score
 */
export function getGradeDescription(score: number): string {
  const scale = LSC_GRADING_SCALE.find(g => score >= g.minScore && score <= g.maxScore);
  return scale?.description || 'Fail';
}

/**
 * Get grade scale entry by score
 */
export function getGradeScale(score: number): LSCGradingScale | undefined {
  return LSC_GRADING_SCALE.find(g => score >= g.minScore && score <= g.maxScore);
}

/**
 * Get grade color from score
 */
export function getGradeColor(score: number): string {
  const scale = LSC_GRADING_SCALE.find(g => score >= g.minScore && score <= g.maxScore);
  return scale?.color || '#991b1b';
}

/**
 * Calculate overall achievement based on average score
 */
export function calculateOverallAchievement(averageScore: number): string {
  if (averageScore >= 90) return 'Excellent';
  if (averageScore >= 80) return 'Very Good';
  if (averageScore >= 70) return 'Good';
  if (averageScore >= 60) return 'Above Average';
  if (averageScore >= 50) return 'Average';
  if (averageScore >= 40) return 'Below Average';
  if (averageScore >= 30) return 'Poor';
  if (averageScore >= 20) return 'Very Poor';
  return 'Fail';
}

/**
 * Get default LSC report card configuration
 */
export function getDefaultLSCReportCardConfig(schoolName: string): LSCReportCardConfig {
  return {
    schoolName,
    reportLevel: 'lower-secondary',
    subjects: LSC_STANDARD_SUBJECTS,
    gradingScale: LSC_GRADING_SCALE,
    competencies: LSC_COMPETENCIES,
    sections: {
      showAcademicResults: true,
      showCompetencies: true,
      showBehaviour: true,
      showTeacherRemarks: true,
      showPromotionStatus: true,
      showParentSignature: true,
    },
  };
}

/**
 * Format report card data according to LSC layout
 */
export interface LSCReportCardData {
  studentName: string;
  admissionNumber: string;
  className: string;
  termName: string;
  academicYear: string;
  dateOfBirth?: string;
  gender?: string;
  guardianName?: string;
  schoolName: string;
  subjects: {
    code: string;
    name: string;
    score: number;
    grade: string;
  }[];
  classRank: number;
  totalStudentsInClass: number;
  averageScore: number;
  overallGrade: string;
  overallAchievement: string;
  competencies: {
    code: string;
    name: string;
    rating: number; // 1-5 scale
  }[];
  behaviour: {
    attendance: string;
    conduct: string;
    punctuality: string;
  };
  teacherRemarks?: string;
  promotionStatus?: string;
  publishedDate?: string;
}
