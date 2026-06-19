export interface PLEGrade {
  score: number;
  grade: string;
  label: string;
}

export function pleGrade(score: number): PLEGrade {
  if (score >= 90) return { score, grade: "D1", label: "Distinction 1" };
  if (score >= 80) return { score, grade: "D2", label: "Distinction 2" };
  if (score >= 70) return { score, grade: "C3", label: "Credit 3" };
  if (score >= 60) return { score, grade: "C4", label: "Credit 4" };
  if (score >= 55) return { score, grade: "C5", label: "Credit 5" };
  if (score >= 50) return { score, grade: "C6", label: "Credit 6" };
  if (score >= 45) return { score, grade: "P7", label: "Pass 7" };
  if (score >= 40) return { score, grade: "P8", label: "Pass 8" };
  return { score, grade: "F9", label: "Failure 9" };
}

export function pleAggregate(grades: string[]): number {
  const gradePoints: Record<string, number> = {
    D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, P8: 8, F9: 9,
  };
  return grades.reduce((sum, g) => sum + (gradePoints[g] || 9), 0);
}

export function pleDivision(aggregate: number): string {
  if (aggregate <= 12) return "Division 1";
  if (aggregate <= 24) return "Division 2";
  if (aggregate <= 32) return "Division 3";
  return "Division 4";
}

export type NlscScore = 1 | 2 | 3;

export function nlscLabel(score: NlscScore): string {
  const labels: Record<NlscScore, string> = {
    1: "Achieved/Excellent",
    2: "Moderate",
    3: "Basic",
  };
  return labels[score];
}

export function nlscCompetencyComment(avg: number): string {
  if (avg <= 1.3) return "The learner shows mastery in applying concepts and consistently demonstrates independent problem-solving skills.";
  if (avg <= 1.8) return "The learner competently applies knowledge with minimal guidance and shows good understanding of core concepts.";
  if (avg <= 2.3) return "The learner achieves learning outcomes with some support and is developing confidence in applying skills.";
  return "The learner requires continuous support to complete learning activities and is making gradual progress.";
}

export type EcdStage = "developing" | "achieving" | "excelling";

export function ecdLabel(stage: EcdStage): string {
  const labels: Record<EcdStage, string> = {
    developing: "Developing (Stage 1)",
    achieving: "Achieving (Stage 2)",
    excelling: "Excelling (Stage 3)",
  };
  return labels[stage];
}

export function ecdNarrative(domain: string, stage: EcdStage): string {
  const narratives: Record<string, Record<EcdStage, string>> = {
    "Health & Physical": {
      developing: "Is beginning to participate in physical activities and developing motor coordination.",
      achieving: "Actively participates in physical activities and shows improving motor skills.",
      excelling: "Exhibits excellent physical coordination and confidently engages in all activities.",
    },
    "Communication & Language": {
      developing: "Is developing basic communication skills and building vocabulary.",
      achieving: "Communicates effectively and expresses ideas clearly with growing vocabulary.",
      excelling: "Demonstrates exceptional communication skills and uses complex language structures.",
    },
    "Cognitive": {
      developing: "Is beginning to explore concepts and develop problem-solving awareness.",
      achieving: "Shows good cognitive development and applies logic to everyday situations.",
      excelling: "Displays advanced critical thinking and creative problem-solving abilities.",
    },
    "Social & Emotional": {
      developing: "Is learning to interact with peers and regulate emotions.",
      achieving: "Interacts positively with others and shows emotional maturity.",
      excelling: "Demonstrates outstanding social skills and serves as a role model for peers.",
    },
    "Values & Attitudes": {
      developing: "Is beginning to understand and practice basic values.",
      achieving: "Consistently demonstrates positive values and respectful behavior.",
      excelling: "Exemplifies strong moral values and positively influences others.",
    },
  };
  return narratives[domain]?.[stage] || `${stage} in ${domain}`;
}

export function calculateAttendancePct(present: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((present / total) * 100);
}

export function isAttendanceLocked(pct: number): boolean {
  return pct < 75;
}

export type RaceScore = {
  relevance: number;
  accuracy: number;
  coherence: number;
  excellence: number;
};

export function calculateRaceTotal(race: RaceScore): number {
  const total = race.relevance + race.accuracy + race.coherence + race.excellence;
  return Math.round((total / 4) * 10) / 10;
}