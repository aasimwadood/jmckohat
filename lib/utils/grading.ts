// Single grading scale, shared by every dashboard that shows a grade or
// GPA. Matches the scale documented on the legacy Controller dashboard's
// (previously purely informational) "Exam Policies" tab: A 85-100 (4.0),
// B 70-84 (3.0), C 60-69 (2.0), D 50-59 (1.0), F <50 (0.0).
export function letterGrade(total: number): "A" | "B" | "C" | "D" | "F" {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  return "F";
}

export function gradePoint(total: number): number {
  switch (letterGrade(total)) {
    case "A":
      return 4.0;
    case "B":
      return 3.0;
    case "C":
      return 2.0;
    case "D":
      return 1.0;
    default:
      return 0.0;
  }
}

/** Simple unweighted GPA across a set of course totals — computed on read, never stored. */
export function computeGpa(totals: number[]): number {
  if (totals.length === 0) return 0;
  const sum = totals.reduce((acc, t) => acc + gradePoint(t), 0);
  return Math.round((sum / totals.length) * 100) / 100;
}
