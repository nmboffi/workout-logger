import type { WorkoutLog, ExerciseFeel } from "./types";

// Most recent logged performance of an exercise, searched across both
// program modes — the "baseline to beat" line shown wherever a lift appears.

export interface LastPerformance {
  date: string;
  // Main-style entries: the rep-out result at the prescribed weight.
  prescribedWeight: number | null;
  repsOnLastSet: number | null;
  // Set-style entries (pull/accessory): best set and a compact summary.
  bestSet: { weight: number; reps: number } | null;
  setSummary: string;
  feel: ExerciseFeel | null;
}

export function getLastPerformance(
  logs: WorkoutLog[],
  exerciseName: string
): LastPerformance | null {
  const completed = [...logs]
    .filter((l) => l.completed)
    .sort((a, b) =>
      (b.completedAt ?? b.startedAt ?? b.date).localeCompare(
        a.completedAt ?? a.startedAt ?? a.date
      )
    );

  for (const log of completed) {
    for (const entry of log.exercises) {
      if (entry.exerciseName !== exerciseName) continue;

      if (entry.repsOnLastSet != null) {
        return {
          date: log.date,
          prescribedWeight: entry.prescribedWeight,
          repsOnLastSet: entry.repsOnLastSet,
          bestSet: null,
          setSummary: "",
          feel: entry.feel,
        };
      }

      const setsWithData = entry.accessorySets.filter(
        (s) => s.weight != null && s.reps != null
      );
      if (setsWithData.length > 0) {
        let best = setsWithData[0];
        for (const s of setsWithData) {
          if (
            (s.weight ?? 0) > (best.weight ?? 0) ||
            ((s.weight ?? 0) === (best.weight ?? 0) && (s.reps ?? 0) > (best.reps ?? 0))
          ) {
            best = s;
          }
        }
        return {
          date: log.date,
          prescribedWeight: null,
          repsOnLastSet: null,
          bestSet: { weight: best.weight as number, reps: best.reps as number },
          setSummary: setsWithData.map((s) => `${s.weight}×${s.reps}`).join(" · "),
          feel: entry.feel,
        };
      }
    }
  }
  return null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2026-07-11" -> "Jul 11" without new Date() timezone surprises.
export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  const month = MONTHS[parseInt(m, 10) - 1] ?? m;
  return `${month} ${parseInt(d, 10)}`;
}

export function lastPerformanceLine(lp: LastPerformance): string {
  const date = shortDate(lp.date);
  const feel = lp.feel ? ` · ${lp.feel}` : "";
  if (lp.repsOnLastSet != null) {
    const weight = lp.prescribedWeight != null ? `${lp.prescribedWeight} × ` : "";
    return `${weight}${lp.repsOnLastSet} reps · ${date}${feel}`;
  }
  if (lp.setSummary) return `${lp.setSummary} · ${date}${feel}`;
  return date;
}
