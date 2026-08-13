// Load display helpers — one source of truth for how a lift's weight is
// labeled in the UI. Per-DB lifts show total with a per-DB breakdown; the
// plate-loaded machines carry an explicit loadLabel in the pool ("/side",
// "/leg") so prescriptions are unambiguous at the machine.
import type { ExercisePoolFile } from "./types";
import { DB_EXERCISES } from "./theme";
import exercisesData from "../data/exercises.json";

const pool = exercisesData as unknown as ExercisePoolFile;
const labelByName = new Map(
  pool.exercises
    .filter((e) => e.loadLabel != null)
    .map((e) => [e.name, e.loadLabel as string])
);

export function formatWeight(weight: number, exerciseName: string): string {
  if (DB_EXERCISES.has(exerciseName)) {
    return `${weight * 2} lbs (${weight} ea)`;
  }
  const label = labelByName.get(exerciseName);
  if (label === "/side") return `${weight}/side (${weight * 2} total)`;
  if (label) return `${weight} lbs ${label}`;
  return `${weight} lbs`;
}

// Prescription-grid parts for the workout screen.
export function rxWeightParts(
  weight: number | null,
  exerciseName: string
): { label: string; value: string; unit: string } {
  if (weight != null && DB_EXERCISES.has(exerciseName)) {
    return { label: "Total", value: `${weight * 2}`, unit: `(${weight} ea)` };
  }
  const label = weight != null ? labelByName.get(exerciseName) : undefined;
  if (label === "/side") {
    return { label: "Per side", value: `${weight}`, unit: `(${weight! * 2} total)` };
  }
  if (label === "/leg") {
    return { label: "Per leg", value: `${weight}`, unit: "lbs" };
  }
  return { label: "Weight", value: `${weight}`, unit: "lbs" };
}
