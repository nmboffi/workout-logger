import type { ExerciseFeel, ProgramMode, DayType } from "./types";

// Versioned payload the log-workout skill produces from a dictated recap.
// Frozen contract: kind + version gate parsing so old links stay importable.

export interface ImportExercisePayload {
  exerciseName: string;
  category?: "main" | "pull" | "accessory";
  repsOnLastSet?: number | null;
  feel?: ExerciseFeel | null;
  notes?: string;
  accessorySets?: { weight: number | null; reps: number | null; done?: boolean }[];
  done?: boolean;
  prescribedWeight?: number | null;
  prescribedReps?: number | null;
  repOutTarget?: number | null;
  sets?: number | null;
}

export interface ImportWorkoutPayload {
  importId?: string;
  date: string; // YYYY-MM-DD
  mode?: ProgramMode; // default "random"
  dayType?: DayType;
  dayLabel?: string;
  weekNumber?: number | null;
  dayIndex?: number | null;
  notes?: string;
  exercises: ImportExercisePayload[];
}

export interface ImportPayload {
  kind: "workout-logger-import";
  version: 1;
  workouts: ImportWorkoutPayload[];
}

export type ParsedImport =
  | { type: "workouts"; payload: ImportPayload; warnings: string[] }
  | { type: "backup"; raw: string }
  | { type: "error"; errors: string[] };

const VALID_CATEGORIES = new Set(["main", "pull", "accessory"]);
const VALID_FEELS = new Set(["easy", "moderate", "hard", "grinder"]);
const VALID_MODES = new Set(["sbs", "random"]);
const VALID_DAY_TYPES = new Set(["full", "light", "rest"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Deterministic id: re-running the skill on the same recap produces the same
// id, so accidental double-imports dedupe. djb2 over the sorted names.
export function computeImportId(w: ImportWorkoutPayload): string {
  const names = w.exercises.map((e) => e.exerciseName).sort().join("|");
  let hash = 5381;
  for (let i = 0; i < names.length; i++) {
    hash = ((hash << 5) + hash + names.charCodeAt(i)) >>> 0;
  }
  return `${w.date}-${w.mode ?? "random"}-${hash.toString(36)}`;
}

function isFiniteNumberOrNull(v: unknown): boolean {
  return v == null || (typeof v === "number" && Number.isFinite(v));
}

export function parseImportText(
  text: string,
  knownNames: Set<string>
): ParsedImport {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return { type: "error", errors: ["Not valid JSON."] };
  }
  if (data == null || typeof data !== "object") {
    return { type: "error", errors: ["Expected a JSON object."] };
  }

  // A pasted full export (Settings -> Export All Data) restores everything.
  if (data.workout_logs !== undefined || data.training_maxes !== undefined) {
    return { type: "backup", raw: text };
  }

  if (data.kind !== "workout-logger-import") {
    return {
      type: "error",
      errors: ['Unrecognized payload: expected "kind": "workout-logger-import" or a full data export.'],
    };
  }
  if (data.version !== 1) {
    return { type: "error", errors: [`Unsupported payload version: ${data.version}`] };
  }
  if (!Array.isArray(data.workouts) || data.workouts.length === 0) {
    return { type: "error", errors: ["Payload has no workouts."] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  data.workouts.forEach((w: any, wi: number) => {
    const tag = `Workout ${wi + 1}`;
    if (typeof w !== "object" || w == null) {
      errors.push(`${tag}: not an object.`);
      return;
    }
    if (typeof w.date !== "string" || !DATE_RE.test(w.date)) {
      errors.push(`${tag}: date must be YYYY-MM-DD.`);
    }
    if (w.mode != null && !VALID_MODES.has(w.mode)) {
      errors.push(`${tag}: invalid mode "${w.mode}".`);
    }
    if (w.dayType != null && !VALID_DAY_TYPES.has(w.dayType)) {
      errors.push(`${tag}: invalid dayType "${w.dayType}".`);
    }
    if (!Array.isArray(w.exercises) || w.exercises.length === 0) {
      errors.push(`${tag}: no exercises.`);
      return;
    }
    w.exercises.forEach((e: any, ei: number) => {
      const etag = `${tag}, exercise ${ei + 1}`;
      if (typeof e !== "object" || e == null || typeof e.exerciseName !== "string" || !e.exerciseName.trim()) {
        errors.push(`${etag}: missing exerciseName.`);
        return;
      }
      if (e.category != null && !VALID_CATEGORIES.has(e.category)) {
        errors.push(`${etag} (${e.exerciseName}): invalid category "${e.category}".`);
      }
      if (e.feel != null && !VALID_FEELS.has(e.feel)) {
        errors.push(`${etag} (${e.exerciseName}): invalid feel "${e.feel}".`);
      }
      if (!isFiniteNumberOrNull(e.repsOnLastSet)) {
        errors.push(`${etag} (${e.exerciseName}): repsOnLastSet must be a number.`);
      }
      if (e.accessorySets != null) {
        if (!Array.isArray(e.accessorySets)) {
          errors.push(`${etag} (${e.exerciseName}): accessorySets must be an array.`);
        } else {
          for (const s of e.accessorySets) {
            if (!isFiniteNumberOrNull(s?.weight) || !isFiniteNumberOrNull(s?.reps)) {
              errors.push(`${etag} (${e.exerciseName}): set weights/reps must be numbers.`);
              break;
            }
          }
        }
      }
      if (!knownNames.has(e.exerciseName)) {
        warnings.push(
          `Unknown exercise "${e.exerciseName}" — it will be logged but won't autoregulate or match history until the name is added to the pool.`
        );
      }
    });
  });

  if (errors.length > 0) return { type: "error", errors };
  return { type: "workouts", payload: data as ImportPayload, warnings };
}

// base64url helpers for the #import= link (ASCII JSON payloads).
export function decodeImportFragment(fragment: string): string | null {
  try {
    let b64 = fragment.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    return atob(b64);
  } catch {
    return null;
  }
}
