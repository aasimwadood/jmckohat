// Intermediate programs reuse the existing semesters table as years (First
// Year = semester 1, Second Year = semester 2) rather than a new schema
// concept — see docs/MIGRATION_PLAN.md's Fee Management Phase 3 writeup.
// `degree_level` is free text (never enumerated, per 0002_profiles_and_orgs.sql's
// own comment), so this is a case-insensitive match, not an enum check.

export function isIntermediateDegreeLevel(degreeLevel: string | null | undefined): boolean {
  return (degreeLevel ?? "").trim().toLowerCase() === "intermediate";
}

/** Intermediate programs only ever span 2 years (semesters 1-2); every other degree level uses the existing 8-semester cap. */
export function maxSemesterNumberFor(degreeLevel: string | null | undefined): number {
  return isIntermediateDegreeLevel(degreeLevel) ? 2 : 8;
}

const INTERMEDIATE_YEAR_LABELS: Record<number, string> = { 1: "First Year", 2: "Second Year" };

/** "Semester 3" for a BS-style program, "First Year" / "Second Year" for an Intermediate one. */
export function semesterLabel(semesterNumber: number, degreeLevel: string | null | undefined): string {
  if (isIntermediateDegreeLevel(degreeLevel)) {
    return INTERMEDIATE_YEAR_LABELS[semesterNumber] ?? `Year ${semesterNumber}`;
  }
  return `Semester ${semesterNumber}`;
}
