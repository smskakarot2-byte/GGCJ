export interface GradeInfo {
  grade: string;
  gradePoint: number;
  status: "Pass" | "Fail";
}

// Exact GGC per-percentage grade-point lookup table
const GRADE_POINT_MAP: Record<number, number> = {
  84: 3.95, 83: 3.90, 82: 3.85, 81: 3.80, 80: 3.75,
  79: 3.70, 78: 3.65, 77: 3.60, 76: 3.55, 75: 3.50,
  74: 3.45, 73: 3.40, 72: 3.35, 71: 3.30, 70: 3.25,
  69: 3.20, 68: 3.15, 67: 3.10, 66: 3.05, 65: 3.00,
  64: 2.94, 63: 2.88, 62: 2.82, 61: 2.76, 60: 2.70,
  59: 2.63, 58: 2.56, 57: 2.49, 56: 2.42, 55: 2.35,
  54: 2.28, 53: 2.21, 52: 2.14, 51: 2.07, 50: 2.00,
  49: 1.90, 48: 1.80, 47: 1.70, 46: 1.60, 45: 1.50,
  44: 1.40, 43: 1.30, 42: 1.20, 41: 1.10, 40: 1.00,
};

export function getGradePoint(percentage: number): number {
  const p = Math.round(percentage);
  if (p >= 85) return 4.00;
  if (p in GRADE_POINT_MAP) return GRADE_POINT_MAP[p];
  return 0.00; // below 40 → F grade → 0 grade points (per GGC policy)
}

export function computeGrade(percentage: number): GradeInfo {
  const p = Math.round(percentage);
  const status: "Pass" | "Fail" = percentage >= 40 ? "Pass" : "Fail";

  let grade: string;
  if (p >= 85)      grade = "A";
  else if (p >= 80) grade = "A-";
  else if (p >= 75) grade = "B+";
  else if (p >= 70) grade = "B";
  else if (p >= 65) grade = "B-";
  else if (p >= 60) grade = "C+";
  else if (p >= 55) grade = "C";
  else if (p >= 50) grade = "C-";
  else if (p >= 45) grade = "D+";
  else if (p >= 40) grade = "D";
  else              grade = "F";

  return { grade, gradePoint: getGradePoint(percentage), status };
}

export function computeGPA(
  results: Array<{ gradePoint: number; creditHours: number; status: string }>,
): number {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const r of results) {
    totalPoints += r.gradePoint * r.creditHours;
    totalCredits += r.creditHours;
  }
  if (totalCredits === 0) return 0;
  return Math.round((totalPoints / totalCredits) * 10000) / 10000;
}

export function computePercentage(obtained: number, maxMarks: number): number {
  if (maxMarks <= 0) return 0;
  return Math.round((obtained / maxMarks) * 10000) / 100;
}

export function parseCreditHours(raw: string): number {
  const match = raw.match(/^(\d+(?:\.\d+)?)/);
  if (match) return parseFloat(match[1]);
  return 3;
}
