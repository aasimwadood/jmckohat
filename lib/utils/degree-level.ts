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

/** "5th" (for the "Discipline - 5th" style used on the fee voucher); "1st Year"/"2nd Year" for Intermediate. */
export function semesterOrdinal(semesterNumber: number, degreeLevel: string | null | undefined): string {
  if (isIntermediateDegreeLevel(degreeLevel)) {
    return semesterNumber === 1 ? "1st Year" : semesterNumber === 2 ? "2nd Year" : `Year ${semesterNumber}`;
  }
  const suffix =
    semesterNumber % 10 === 1 && semesterNumber % 100 !== 11
      ? "st"
      : semesterNumber % 10 === 2 && semesterNumber % 100 !== 12
        ? "nd"
        : semesterNumber % 10 === 3 && semesterNumber % 100 !== 13
          ? "rd"
          : "th";
  return `${semesterNumber}${suffix}`;
}

/**
 * "Fall 2026" / "Spring 2026" for the fee voucher's session title — derived
 * from the semester's parity (odd = Fall, even = Spring, the standard
 * Pakistani academic-calendar convention) combined with the year embedded
 * in the academic session's own label. `academic_sessions.label` is plain
 * free text (e.g. "2025", sometimes already "FALL-2024") — if it already
 * names a term, it's used as-is rather than double-prefixed; otherwise the
 * first 4-digit year found in it is combined with the derived term.
 */
export function sessionDisplayLabel(semesterNumber: number, sessionLabel: string): string {
  if (/fall|spring/i.test(sessionLabel)) return sessionLabel;
  const year = sessionLabel.match(/\d{4}/)?.[0];
  if (!year) return sessionLabel;
  const term = semesterNumber % 2 === 1 ? "Fall" : "Spring";
  return `${term} ${year}`;
}
