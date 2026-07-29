export interface GradeInfo {
  grade: string;
  gradePoint: number;
  status: "Pass" | "Fail";
}

// GGC per-percentage grade-point lookup table
const GRADE_POINT_MAP: Record<number, number> = {
  // A-  (80–84%)
  84: 3.95, 83: 3.90, 82: 3.85, 81: 3.80, 80: 3.75,
  // B+  (70–79%)
  79: 3.70, 78: 3.67, 77: 3.63, 76: 3.59, 75: 3.55,
  74: 3.51, 73: 3.47, 72: 3.43, 71: 3.39, 70: 3.35,
  // B   (65–69%)
  69: 3.28, 68: 3.21, 67: 3.14, 66: 3.07, 65: 3.00,
  // B-  (60–64%)
  64: 2.94, 63: 2.88, 62: 2.82, 61: 2.76, 60: 2.70,
  // C+  (55–59%)
  59: 2.63, 58: 2.56, 57: 2.49, 56: 2.42, 55: 2.35,
  // C   (50–54%)
  54: 2.28, 53: 2.21, 52: 2.14, 51: 2.07, 50: 2.00,
  // C-  (45–49%)
  49: 1.90, 48: 1.80, 47: 1.70, 46: 1.60, 45: 1.50,
  // D   (40–44%)
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
  else if (p >= 70) grade = "B+";
  else if (p >= 65) grade = "B";
  else if (p >= 60) grade = "B-";
  else if (p >= 55) grade = "C+";
  else if (p >= 50) grade = "C";
  else if (p >= 45) grade = "C-";
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
