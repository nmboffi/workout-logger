export interface ProgramConfig {
  rounding: number;
  mainLifts: LiftConfig[];
  auxiliaries: AuxiliaryConfig[];
  accessoryPools: Record<string, string[]>;
  autoregulation: Record<string, AutoregConfig>;
  intensityLevels: number[];
  normalRepTargets: Record<string, Record<string, number>>;
  lastSetRepTargets: Record<string, Record<string, number>>;
}

export interface LiftConfig {
  name: string;
  trainingMax: number;
  singleAt8Pct: number;
}

export interface AuxiliaryConfig extends LiftConfig {
  slot: string;
}

export interface AutoregConfig {
  sets: number;
  adjustments: {
    below_by_2plus: number;
    below_by_1: number;
    hit_target: number;
    beat_by_1: number;
    beat_by_2: number;
    beat_by_3: number;
    beat_by_4: number;
  };
}

export interface WeekConfig {
  weekNumber: number;
  exerciseConfigs: Record<
    string,
    { intensity: number; reps: number; repOutTarget: number; sets: number }
  >;
}

export interface WeekExerciseData {
  weekNumber: number;
  trainingMax?: number;
  weight?: number;
  reps?: number | string;
  repOutTarget?: number | string;
  sets?: number;
  repsOnLastSet?: number;
  notes?: string;
}

export interface TemplateExercise {
  name: string;
  category: "main" | "accessory";
  weekData: WeekExerciseData[];
}

export interface TemplateDay {
  label: string;
  exercises: TemplateExercise[];
}

export type ScheduleType = "(3+1)x" | "4x";

export interface ProgramData {
  name: string;
  sourceFile: string;
  config: ProgramConfig;
  weekSchedule: WeekConfig[];
  templates: Record<string, TemplateDay[]>;
}

// Runtime state

export interface ExerciseState {
  id: string;
  name: string;
  category: "main" | "pull" | "accessory";
  trainingMax: number;
  singleAt8Pct: number;
  sets: number;
  supersetGroup: string | null;
  order: number;
}

export interface WorkoutDay {
  dayIndex: number;
  label: string;
  exercises: ExerciseState[];
}

export interface WorkoutLog {
  id: string;
  date: string;
  weekNumber: number;
  dayIndex: number;
  dayLabel: string;
  exercises: ExerciseLogEntry[];
  notes: string;
  completed: boolean;
  startedAt: string;
  completedAt: string | null;
}

export interface ExerciseLogEntry {
  exerciseId: string;
  exerciseName: string;
  category: "main" | "pull" | "accessory";
  prescribedWeight: number | null;
  prescribedReps: number | null;
  repOutTarget: number | null;
  sets: number | null;
  repsOnLastSet: number | null;
  tmSingleWeight: number | null;
  accessorySets: AccessorySet[];
  supersetGroup: string | null;
  notes: string;
  feel: "easy" | "moderate" | "hard" | "grinder" | null;
  done: boolean;
}

export type ExerciseFeel = "easy" | "moderate" | "hard" | "grinder";

export interface AccessorySet {
  weight: number | null;
  reps: number | null;
  done: boolean;
}

// Exercise groups by movement pattern
export type MovementCategory = "squat" | "bench" | "deadlift" | "ohp";

export interface ExerciseGroup {
  category: MovementCategory;
  label: string;
  main: { name: string; trainingMax: number };
  auxiliaries: { name: string; slot: string; trainingMax: number }[];
}

// Program versioning
export interface ProgramVersion {
  id: string;
  name: string;
  date: string;
  scheduleType: ScheduleType;
  trainingMaxes: Record<string, number>;
  dayConfigs: WorkoutDay[];
  currentWeek: number;
}
