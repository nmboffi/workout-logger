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

export type ScheduleType = "(3+1)x" | "4x" | "rehab";

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
  // Randomized mode (absent => legacy SBS log). Random logs use sentinels
  // weekNumber: 0, dayIndex: -1.
  mode?: ProgramMode;
  dayType?: DayType;
  importId?: string;
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
  // Randomized mode: which template slot produced this entry, and whether it
  // was a TM-calibration exposure (logged as set rows, seeds the TM on completion).
  slotRole?: SlotRole | "fixed";
  calibration?: boolean;
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

// Randomized program mode

export type ProgramMode = "sbs" | "random";
export type DayType = "full" | "light" | "rest";

export type MovementPattern =
  | "squat"
  | "bench"
  | "deadlift"
  | "ohp"
  | "pull"
  | "core"
  | "carry"
  | "conditioning";

export type SlotRole = "main" | "aux" | "pull" | "accessory";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "trapbar"
  | "band";

export interface PoolExercise {
  id: string;
  // Display name — must match historical exerciseName for carried-over lifts;
  // this is the join key to trainingMaxes and workout log history.
  name: string;
  pattern: MovementPattern;
  roles: SlotRole[];
  equipment: Equipment;
  muscles: string[];
  accessoryPool?: string;
  lightEligible?: boolean;
  intensityBand?: [number, number];
  singleAt8Pct?: number;
  sets?: number;
  supersetTag?: string;
  notes?: string;
}

export interface TemplateSlot {
  slot: string;
  role: SlotRole | "fixed";
  anchor?: boolean;
  relation?: "same-pattern" | "complementary" | "any";
  optional?: boolean;
  pools?: string[];
  distinctGroup?: string;
  lightOnly?: boolean;
  fixed?: { name: string };
}

export interface DayTemplate {
  id: DayType;
  label: string;
  slots: TemplateSlot[];
}

export interface PoolDefaults {
  singleAt8Pct: number;
  sets: number;
  intensityBand: [number, number];
  autoreg: AutoregConfig;
  normalRepTargets: Record<string, number>;
  lastSetRepTargets: Record<string, number>;
  // TM = e1RM * tmSeedFactor when seeding from a calibration set
  tmSeedFactor: number;
}

export interface ExercisePoolFile {
  version: number;
  defaults: PoolDefaults;
  intensityLevels: number[];
  anchorPatterns: MovementPattern[];
  complementaryPatterns: Record<string, MovementPattern[]>;
  dayTemplates: DayTemplate[];
  exercises: PoolExercise[];
}

export interface GeneratedSlot {
  slot: string;
  role: SlotRole | "fixed";
  exerciseId: string | null; // null only for fixed items
  exerciseName: string;
  category: "main" | "pull" | "accessory";
  pattern: MovementPattern | null;
  accessoryPool: string | null;
  supersetGroup: string | null;
  // Chosen intensity is frozen at generation; working weight is recomputed
  // from the current TM when the workout starts.
  intensity: number | null;
  calibration: boolean;
  locked: boolean;
  order: number;
}

export interface GeneratedWorkout {
  id: string;
  createdAt: string;
  dayType: DayType;
  label: string;
  anchorPattern: MovementPattern | null;
  anchorOverride: boolean;
  // Training-day index this plan was generated against (staleness check).
  trainingDayIndex: number;
  seed: number;
  slots: GeneratedSlot[];
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
