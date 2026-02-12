/**
 * Automated Remarks Generator
 * Generates student remarks based on academic performance marks
 */

export interface RemarksConfig {
  excellentMin?: number;
  veryGoodMin?: number;
  goodMin?: number;
  creditMin?: number;
  passMin?: number;
  subsidiaryMin?: number;
}

const defaultConfig: RemarksConfig = {
  excellentMin: 90,
  veryGoodMin: 80,
  goodMin: 70,
  creditMin: 60,
  passMin: 50,
  subsidiaryMin: 40,
};

/**
 * Generate class teacher remarks based on student average score
 */
export const generateClassTeacherRemark = (
  average: number,
  studentName: string,
  config: RemarksConfig = defaultConfig
): string => {
  const firstName = studentName?.split(' ')[0] || 'The student';

  if (average >= (config.excellentMin || 90)) {
    return `${firstName} has demonstrated outstanding academic excellence this term. A truly remarkable performance that sets a benchmark for the entire class. Consistently engaged in class and produces high-quality work. Please maintain this exceptional standard.`;
  }

  if (average >= (config.veryGoodMin || 80)) {
    return `${firstName} has performed exceptionally well this term with strong results across most subjects. Shows great dedication, active participation, and clear understanding of concepts. Encouraged to maintain this commendable standard and strive for even higher achievement.`;
  }

  if (average >= (config.goodMin || 70)) {
    return `${firstName} has shown commendable effort and delivered good results this term. Demonstrates solid understanding of most subjects. With continued focus, consistent attendance, and extra effort in weaker areas, even higher achievement is within reach.`;
  }

  if (average >= (config.creditMin || 60)) {
    return `${firstName} has achieved reasonable results this term but there remains room for improvement in several subjects. Encouraged to seek extra help in challenging areas, improve class participation, and develop consistent study habits. Parents are urged to provide support at home.`;
  }

  if (average >= (config.passMin || 50)) {
    return `${firstName} has achieved a pass but needs to work significantly harder in several subjects. More consistent study habits, regular class attendance, and improved focus are essential. Parents/guardians are encouraged to monitor homework closely and provide additional academic support.`;
  }

  if (average >= (config.subsidiaryMin || 40)) {
    return `${firstName} is performing below the expected standard and needs urgent intervention. A significant improvement plan is required. Parents/guardians should consider engaging a tutor for extra lessons. Close collaboration between home and school is strongly recommended.`;
  }

  return `${firstName} is struggling significantly and requires immediate intervention. Academic support through remedial classes, tutoring, and close supervision is essential. An urgent meeting with parents/guardians is recommended to discuss a structured improvement plan.`;
};

/**
 * Generate head teacher remarks based on student average score
 */
export const generateHeadTeacherRemark = (
  average: number,
  studentName: string,
  config: RemarksConfig = defaultConfig
): string => {
  const firstName = studentName?.split(' ')[0] || 'The student';

  if (average >= (config.veryGoodMin || 80)) {
    return `Congratulations to ${firstName} on achieving excellent academic results this term. The school is proud of this outstanding performance. We encourage continued dedication, hard work, and positive attitude towards learning. You are a role model for other students.`;
  }

  if (average >= (config.creditMin || 60)) {
    return `${firstName} has performed well this term, demonstrating good commitment to academic work. We commend the effort shown and encourage more consistent focus to achieve even better results in the next term. The school remains committed to supporting your academic journey.`;
  }

  if (average >= (config.passMin || 50)) {
    return `${firstName}'s performance this term is satisfactory but requires improvement. We note that with increased effort and focus, significant progress is possible. We urge you to work closely with your class teacher and parents to strengthen weaker areas. The school is here to support you.`;
  }

  if (average >= (config.subsidiaryMin || 40)) {
    return `${firstName}'s academic performance this term is below the expected standard and requires urgent attention. We request a meeting with the parents/guardians to discuss support strategies and create an improvement plan. The school will provide necessary resources to help.`;
  }

  return `${firstName}'s academic performance is a serious cause for concern. We strongly recommend an urgent meeting with parents/guardians to discuss this situation and develop a comprehensive intervention plan. The school is committed to helping but requires parental involvement.`;
};

/**
 * Generate subject-specific remarks based on individual subject scores
 */
export const generateSubjectRemark = (
  score: number,
  subjectName: string,
  config: RemarksConfig = defaultConfig
): string => {
  if (score >= (config.excellentMin || 90)) {
    return `Excellent performance in ${subjectName}. Outstanding understanding and consistent high-quality work.`;
  }

  if (score >= (config.veryGoodMin || 80)) {
    return `Very good performance in ${subjectName}. Strong grasp of concepts with reliable consistency.`;
  }

  if (score >= (config.goodMin || 70)) {
    return `Good performance in ${subjectName}. Solid understanding with room for deeper engagement.`;
  }

  if (score >= (config.creditMin || 60)) {
    return `Fair performance in ${subjectName}. Satisfactory work but would benefit from more effort.`;
  }

  if (score >= (config.passMin || 50)) {
    return `Acceptable in ${subjectName} but improvement is needed. More focused study and practice recommended.`;
  }

  if (score >= (config.subsidiaryMin || 40)) {
    return `Below satisfactory performance in ${subjectName}. Urgent attention and additional support required.`;
  }

  return `Poor performance in ${subjectName}. Significant improvement and intervention needed immediately.`;
};

/**
 * Generate discipline remarks based on discipline rating
 */
export const generateDisciplineRemark = (disciplineRating: string): string => {
  const rating = disciplineRating?.toLowerCase() || '';

  const remarks: Record<string, string> = {
    'excellent': 'Outstanding conduct and discipline. Exemplary behavior that deserves commendation.',
    'well disciplined': 'Well disciplined and maintains excellent conduct throughout the term.',
    'good conduct': 'Good conduct with occasional minor issues. Generally maintains discipline well.',
    'fair': 'Fair conduct with some disciplinary concerns. Improvement in behavior is needed.',
    'needs guidance': 'Needs guidance and closer monitoring. Disciplinary issues have been noted and require parental involvement.',
    'requires close supervision': 'Requires close supervision due to repeated disciplinary incidents. Parents urgently needed to address behavior.',
    'needs improvement': 'Behavior needs significant improvement. Intervention and support are essential.',
  };

  return remarks[rating] || 'Conduct assessment pending review by class teacher.';
};

/**
 * Generate attendance-based remarks
 */
export const generateAttendanceRemark = (
  daysPresent: number,
  totalDays: number
): string => {
  if (totalDays === 0) return 'Attendance record pending.';

  const attendancePercentage = (daysPresent / totalDays) * 100;

  if (attendancePercentage >= 95) {
    return `Excellent attendance (${attendancePercentage.toFixed(1)}%). Regular attendance is commendable and supports academic success.`;
  }

  if (attendancePercentage >= 90) {
    return `Good attendance (${attendancePercentage.toFixed(1)}%). Maintain this positive trend as regular attendance is crucial for learning.`;
  }

  if (attendancePercentage >= 80) {
    return `Attendance is fair (${attendancePercentage.toFixed(1)}%). Efforts should be made to improve attendance further.`;
  }

  if (attendancePercentage >= 70) {
    return `Attendance is below satisfactory (${attendancePercentage.toFixed(1)}%). Regular attendance is important for academic success. Parents should encourage consistent attendance.`;
  }

  return `Attendance is poor (${attendancePercentage.toFixed(1)}%). This significantly impacts learning. Urgent action is required to improve attendance.`;
};

/**
 * Determine overall performance level based on average
 */
export const getPerformanceLevel = (
  average: number,
  config: RemarksConfig = defaultConfig
): {
  level: string;
  description: string;
  color: string;
  recommendation: string;
} => {
  if (average >= (config.excellentMin || 90)) {
    return {
      level: 'Excellent',
      description: 'Outstanding academic performance',
      color: 'bg-green-600 text-white',
      recommendation: 'Maintain current standards and consider advanced/enrichment activities',
    };
  }

  if (average >= (config.veryGoodMin || 80)) {
    return {
      level: 'Very Good',
      description: 'Strong academic performance',
      color: 'bg-green-500 text-white',
      recommendation: 'Continue with consistent effort to achieve even higher results',
    };
  }

  if (average >= (config.goodMin || 70)) {
    return {
      level: 'Good',
      description: 'Satisfactory academic performance',
      color: 'bg-blue-500 text-white',
      recommendation: 'Focus on strengthening weaker subject areas',
    };
  }

  if (average >= (config.creditMin || 60)) {
    return {
      level: 'Credit',
      description: 'Average academic performance',
      color: 'bg-yellow-500 text-white',
      recommendation: 'Increase study effort and seek help in challenging areas',
    };
  }

  if (average >= (config.passMin || 50)) {
    return {
      level: 'Pass',
      description: 'Below average academic performance',
      color: 'bg-orange-500 text-white',
      recommendation: 'Requires significant improvement with parent/guardian support',
    };
  }

  if (average >= (config.subsidiaryMin || 40)) {
    return {
      level: 'Subsidiary',
      description: 'Well below average performance',
      color: 'bg-orange-600 text-white',
      recommendation: 'Urgent intervention and extra lessons necessary',
    };
  }

  return {
    level: 'Failure',
    description: 'Serious academic performance issues',
    color: 'bg-red-600 text-white',
    recommendation: 'Immediate intervention with tutoring and close monitoring required',
  };
};

/**
 * Calculate class rank recommendation based on average and class size
 */
export const calculateRankRecommendation = (
  average: number,
  totalClassSize: number
): string => {
  if (average >= 90) return `Top ${Math.ceil(totalClassSize * 0.1)}`;
  if (average >= 80) return `Top ${Math.ceil(totalClassSize * 0.25)}`;
  if (average >= 70) return `Top ${Math.ceil(totalClassSize * 0.50)}`;
  return `Below top half`;
};

/**
 * Generate comprehensive remarks object for a student
 */
export const generateComprehensiveRemarks = (
  studentName: string,
  average: number,
  disciplineRating: string,
  daysPresent: number,
  totalDays: number,
  config: RemarksConfig = defaultConfig
) => {
  return {
    classTeacherRemark: generateClassTeacherRemark(average, studentName, config),
    headTeacherRemark: generateHeadTeacherRemark(average, studentName, config),
    disciplineRemark: generateDisciplineRemark(disciplineRating),
    attendanceRemark: generateAttendanceRemark(daysPresent, totalDays),
    performanceLevel: getPerformanceLevel(average, config),
  };
};
