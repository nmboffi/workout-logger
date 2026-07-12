import { create } from "zustand";
import type {
  ProgramData,
  WorkoutDay,
  WorkoutLog,
  ExerciseLogEntry,
  ExerciseState,
  AccessorySet,
  ScheduleType,
  ExerciseGroup,
  MovementCategory,
  ProgramVersion,
  AutoregConfig,
  ExercisePoolFile,
  ProgramMode,
  DayType,
  MovementPattern,
  GeneratedWorkout,
} from "./types";
import {
  newTrainingMax,
  prescribeExercise,
  roundWeight,
  workingWeight,
  singleAt8Weight,
} from "./sbs";
import {
  generateWorkout,
  rerollWorkout,
  rerollSlot,
  setWorkoutAnchor,
  setSlotExercise,
  repTargetsFor,
  type GeneratorInputs,
} from "./generator";
import {
  saveWorkoutLogs,
  loadWorkoutLogs,
  saveCurrentWeek,
  loadCurrentWeek,
  saveScheduleType,
  loadScheduleType,
  saveTrainingMaxes,
  loadTrainingMaxes,
  saveDayConfigs,
  loadDayConfigs,
  saveProgramVersions,
  loadProgramVersions,
  saveProgramMode,
  loadProgramMode,
  saveGeneratedWorkout,
  loadGeneratedWorkout,
} from "./storage";
import { PULL_EXERCISES } from "./theme";
import programData from "../data/program.json";
import exercisesData from "../data/exercises.json";

const program = programData as unknown as ProgramData;
const exercisePool = exercisesData as unknown as ExercisePoolFile;
const poolByName = new Map(exercisePool.exercises.map((e) => [e.name, e]));
const poolById = new Map(exercisePool.exercises.map((e) => [e.id, e]));

function makeGeneratorInputs(
  logs: WorkoutLog[],
  trainingMaxes: Record<string, number>
): GeneratorInputs {
  return {
    logs,
    pool: exercisePool,
    trainingMaxes,
    seed: Date.now(),
    createdAt: new Date().toISOString(),
  };
}

function isSbsLog(log: WorkoutLog): boolean {
  return (log.mode ?? "sbs") === "sbs";
}

// Autoreg config for a lift: the SBS program's table, falling back to the
// pool default for lifts that only exist in the randomized-mode pool.
function getAutoregFor(name: string): AutoregConfig | null {
  return (
    program.config.autoregulation[name] ??
    (poolByName.has(name) ? exercisePool.defaults.autoreg : null)
  );
}

// Epley e1RM; accurate in the 5-15 rep range this program lives in.
function estimateOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

// Apply one completed workout's TM effects: calibration entries seed a TM
// from their best logged set; main entries autoregulate off the rep-out.
// Mutates and returns `tms`. Shared by completeWorkout, importWorkouts, and
// replayTrainingMaxes so all three stay in lockstep.
function applyWorkoutTmEffects(
  entries: ExerciseLogEntry[],
  tms: Record<string, number>
): Record<string, number> {
  for (const entry of entries) {
    if (entry.calibration) {
      if (tms[entry.exerciseName] != null) continue;
      let bestE1rm = 0;
      for (const s of entry.accessorySets) {
        if (s.weight != null && s.reps != null && s.reps > 0) {
          bestE1rm = Math.max(bestE1rm, estimateOneRepMax(s.weight, s.reps));
        }
      }
      if (bestE1rm > 0) {
        tms[entry.exerciseName] = roundWeight(
          bestE1rm * exercisePool.defaults.tmSeedFactor,
          program.config.rounding
        );
      }
      continue;
    }
    if (entry.category === "main" && entry.repsOnLastSet !== null && entry.repOutTarget !== null) {
      const autoreg = getAutoregFor(entry.exerciseName);
      if (autoreg && tms[entry.exerciseName] != null) {
        tms[entry.exerciseName] = newTrainingMax(
          tms[entry.exerciseName],
          entry.repsOnLastSet,
          entry.repOutTarget,
          autoreg
        );
      }
    }
  }
  return tms;
}

// Derive exercise groups from the slot field on auxiliaries
function buildExerciseGroups(
  trainingMaxes: Record<string, number>
): ExerciseGroup[] {
  const slotToCategory: Record<string, MovementCategory> = {
    "Squat auxiliary 1": "squat",
    "Squat auxiliary 2": "squat",
    "Bench auxiliary 1": "bench",
    "Bench auxiliary 2": "bench",
    "Deadlift auxiliary": "deadlift",
    "OHP auxiliary": "ohp",
  };

  const mainToCategory: Record<string, MovementCategory> = {
    "Bulgarian Split Squat": "squat",
    "Bench Press": "bench",
    "Trap Bar Deadlift": "deadlift",
    "Overhead Press": "ohp",
  };

  const categoryLabels: Record<MovementCategory, string> = {
    squat: "Squat",
    bench: "Bench",
    deadlift: "Deadlift",
    ohp: "Overhead Press",
  };

  const groups: Record<MovementCategory, ExerciseGroup> = {} as any;

  for (const lift of program.config.mainLifts) {
    const cat = mainToCategory[lift.name];
    if (!cat) continue;
    groups[cat] = {
      category: cat,
      label: categoryLabels[cat],
      main: { name: lift.name, trainingMax: trainingMaxes[lift.name] ?? lift.trainingMax },
      auxiliaries: [],
    };
  }

  for (const aux of program.config.auxiliaries) {
    const cat = slotToCategory[aux.slot];
    if (!cat || !groups[cat]) continue;
    groups[cat].auxiliaries.push({
      name: aux.name,
      slot: aux.slot,
      trainingMax: trainingMaxes[aux.name] ?? aux.trainingMax,
    });
  }

  return [groups.squat, groups.bench, groups.deadlift, groups.ohp].filter(Boolean);
}

interface AppState {
  program: ProgramData;
  scheduleType: ScheduleType;
  currentWeek: number;
  trainingMaxes: Record<string, number>;
  days: WorkoutDay[];
  exerciseGroups: ExerciseGroup[];
  workoutLogs: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  programVersions: ProgramVersion[];
  initialized: boolean;

  // Randomized mode
  programMode: ProgramMode;
  pendingGeneratedWorkout: GeneratedWorkout | null;
  exercisePool: ExercisePoolFile;

  // Actions
  initialize: () => Promise<void>;
  setScheduleType: (type: ScheduleType) => void;
  setCurrentWeek: (week: number) => void;
  updateTrainingMax: (exerciseName: string, newTM: number) => void;

  // Day management
  swapExercise: (dayIndex: number, exerciseId: string, newName: string) => void;
  reorderExercise: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  moveExercise: (fromDayIndex: number, exerciseId: string, toDayIndex: number) => void;
  setSupersetGroup: (dayIndex: number, exerciseId: string, group: string | null) => void;
  resetDays: () => void;

  // Workout
  startWorkout: (dayIndex: number) => void;
  logRepsOnLastSet: (exerciseId: string, reps: number) => void;
  logAccessorySet: (exerciseId: string, setIndex: number, data: Partial<AccessorySet>) => void;
  toggleAccessoryDone: (exerciseId: string) => void;
  addExerciseNote: (exerciseId: string, note: string) => void;
  setExerciseFeel: (exerciseId: string, feel: "easy" | "moderate" | "hard" | "grinder" | null) => void;
  completeWorkout: () => void;
  discardWorkout: () => void;

  // Versioning
  saveVersion: (name: string) => void;
  loadVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

  // Randomized mode
  setProgramMode: (mode: ProgramMode) => void;
  generateRandomWorkout: (dayType: DayType, anchor?: MovementPattern | null) => void;
  rerollRandomWorkout: () => void;
  rerollGeneratedSlot: (slotKey: string) => void;
  setGeneratedAnchor: (pattern: MovementPattern | null) => void;
  setGeneratedSlotExercise: (slotKey: string, exerciseId: string) => void;
  discardGeneratedWorkout: () => void;
  startGeneratedWorkout: () => void;

  // Helpers
  getPrescription: (exerciseName: string, trainingMax: number, singleAt8Pct: number) => ReturnType<typeof prescribeExercise>;
}

function buildInitialDays(
  scheduleType: ScheduleType,
  trainingMaxes: Record<string, number>
): WorkoutDay[] {
  const template = program.templates[scheduleType];
  if (!template) return [];

  return template.map((day, dayIndex) => ({
    dayIndex,
    label: day.label,
    exercises: day.exercises.map((ex, order) => {
      const mainLift = program.config.mainLifts.find((l) => l.name === ex.name);
      const auxLift = program.config.auxiliaries.find((l) => l.name === ex.name);
      const lift = mainLift || auxLift;

      return {
        id: `${dayIndex}-${order}-${ex.name}`,
        name: ex.name,
        category: (ex.category === "main" ? "main" : PULL_EXERCISES.has(ex.name) ? "pull" : "accessory") as "main" | "pull" | "accessory",
        trainingMax: trainingMaxes[ex.name] ?? lift?.trainingMax ?? 0,
        singleAt8Pct: lift?.singleAt8Pct ?? 0.9,
        sets: program.config.autoregulation[ex.name]?.sets ?? 0,
        supersetGroup: null,
        order,
      };
    }),
  }));
}

function buildInitialTrainingMaxes(): Record<string, number> {
  const maxes: Record<string, number> = {};
  for (const lift of program.config.mainLifts) maxes[lift.name] = lift.trainingMax;
  for (const lift of program.config.auxiliaries) maxes[lift.name] = lift.trainingMax;
  return maxes;
}

// Re-classify pull exercises on loaded day configs (fixes cached data from before pull category existed)
function reclassifyPulls(days: WorkoutDay[]): WorkoutDay[] {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      category: ex.category === "main" ? "main" : PULL_EXERCISES.has(ex.name) ? "pull" : "accessory",
    })) as ExerciseState[],
  }));
}

// Week inference only makes sense for SBS logs; random-mode logs use the
// weekNumber: 0 sentinel and must not participate.
function inferCurrentWeek(logs: WorkoutLog[]): number {
  const sbsLogs = logs.filter(isSbsLog);
  if (sbsLogs.length === 0) return 1;
  const maxWeek = Math.max(...sbsLogs.map((l) => l.weekNumber));
  const template = program.templates["4x"];
  const logsThisWeek = sbsLogs.filter((l) => l.weekNumber === maxWeek);
  if (logsThisWeek.length >= (template?.length ?? 4)) {
    return Math.min(maxWeek + 1, 21);
  }
  return maxWeek;
}

// TMs are shared across modes, so replay covers logs from both, in date order.
function replayTrainingMaxes(
  logs: WorkoutLog[],
  baseTMs: Record<string, number>
): Record<string, number> {
  const tms = { ...baseTMs };
  const sortedLogs = [...logs].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.weekNumber - b.weekNumber ||
      a.dayIndex - b.dayIndex
  );
  for (const log of sortedLogs) {
    applyWorkoutTmEffects(log.exercises, tms);
  }
  return tms;
}

// Empty set rows for a pull/accessory entry: 3 sets, 4 for pulls.
function emptyAccessorySets(category: "main" | "pull" | "accessory"): AccessorySet[] {
  return [
    { weight: null, reps: null, done: false },
    { weight: null, reps: null, done: false },
    { weight: null, reps: null, done: false },
    ...(category === "pull" ? [{ weight: null, reps: null, done: false }] : []),
  ];
}

// Build log entries for an SBS day (week-based prescriptions).
function buildSbsLogEntries(
  exercises: ExerciseState[],
  currentWeek: number,
  trainingMaxes: Record<string, number>
): ExerciseLogEntry[] {
  return exercises.map((ex) => {
    if (ex.category === "main" && ex.trainingMax > 0) {
      const prescription = prescribeExercise(
        ex.name,
        trainingMaxes[ex.name] ?? ex.trainingMax,
        ex.singleAt8Pct,
        currentWeek,
        program.weekSchedule,
        program.config.rounding
      );
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: "main" as const,
        prescribedWeight: prescription?.workingWeight ?? null,
        prescribedReps: prescription?.reps ?? null,
        repOutTarget: prescription?.repOutTarget ?? null,
        sets: prescription?.sets ?? null,
        repsOnLastSet: null,
        tmSingleWeight: prescription?.tmSingleWeight ?? null,
        accessorySets: [],
        supersetGroup: ex.supersetGroup,
        notes: "",
        feel: null,
        done: false,
      };
    }
    return {
      exerciseId: ex.id,
      exerciseName: ex.name,
      category: ex.category as "main" | "pull" | "accessory",
      prescribedWeight: null,
      prescribedReps: null,
      repOutTarget: null,
      sets: null,
      repsOnLastSet: null,
      tmSingleWeight: null,
      accessorySets: emptyAccessorySets(ex.category),
      supersetGroup: ex.supersetGroup,
      notes: "",
      feel: null,
      done: false,
    };
  });
}

// Build log entries for a generated (randomized-mode) workout. Exercise picks
// and intensities were frozen at generation; working weights are computed here
// from the *current* TMs so a TM edit between generation and training counts.
function buildGeneratedLogEntries(
  gw: GeneratedWorkout,
  trainingMaxes: Record<string, number>
): ExerciseLogEntry[] {
  return gw.slots.map((slot) => {
    const poolEx = slot.exerciseId ? poolById.get(slot.exerciseId) : undefined;
    const tm = trainingMaxes[slot.exerciseName];

    if (slot.category === "main" && slot.intensity != null && tm != null) {
      const targets = repTargetsFor(slot.intensity, exercisePool);
      return {
        exerciseId: `${slot.slot}-${slot.exerciseName}`,
        exerciseName: slot.exerciseName,
        category: "main" as const,
        prescribedWeight: workingWeight(tm, slot.intensity, program.config.rounding),
        prescribedReps: targets.reps,
        repOutTarget: targets.repOutTarget,
        sets: poolEx?.sets ?? exercisePool.defaults.sets,
        repsOnLastSet: null,
        tmSingleWeight: singleAt8Weight(
          tm,
          poolEx?.singleAt8Pct ?? exercisePool.defaults.singleAt8Pct,
          program.config.rounding
        ),
        accessorySets: [],
        supersetGroup: slot.supersetGroup,
        notes: "",
        feel: null,
        done: false,
        slotRole: slot.role,
      };
    }

    const category = slot.category === "main" ? "accessory" : slot.category;
    return {
      exerciseId: `${slot.slot}-${slot.exerciseName}`,
      exerciseName: slot.exerciseName,
      category,
      prescribedWeight: null,
      prescribedReps: null,
      repOutTarget: null,
      sets: null,
      repsOnLastSet: null,
      tmSingleWeight: null,
      accessorySets: slot.role === "fixed" ? [] : emptyAccessorySets(category),
      supersetGroup: slot.supersetGroup,
      notes: slot.calibration
        ? "Calibration: work up to one hard set of 5-10 reps"
        : "",
      feel: null,
      done: false,
      slotRole: slot.role,
      ...(slot.calibration ? { calibration: true } : {}),
    };
  });
}

export const useStore = create<AppState>((set, get) => ({
  program,
  scheduleType: "4x",
  currentWeek: 1,
  trainingMaxes: {},
  days: [],
  exerciseGroups: [],
  workoutLogs: [],
  activeWorkout: null,
  programVersions: [],
  initialized: false,
  programMode: "sbs",
  pendingGeneratedWorkout: null,
  exercisePool,

  initialize: async () => {
    const [logs, savedWeek, savedSchedule, savedTMs, savedDays, versions, savedMode, savedGenerated] =
      await Promise.all([
        loadWorkoutLogs(),
        loadCurrentWeek(),
        loadScheduleType(),
        loadTrainingMaxes(),
        loadDayConfigs(),
        loadProgramVersions(),
        loadProgramMode(),
        loadGeneratedWorkout(),
      ]);

    const baseTMs = buildInitialTrainingMaxes();
    const trainingMaxes =
      Object.keys(savedTMs).length > 0 ? savedTMs : replayTrainingMaxes(logs, baseTMs);
    const currentWeek = logs.some(isSbsLog) ? inferCurrentWeek(logs) : savedWeek;
    const rawDays = savedDays || buildInitialDays(savedSchedule, trainingMaxes);
    const days = reclassifyPulls(rawDays);
    const exerciseGroups = buildExerciseGroups(trainingMaxes);

    set({
      workoutLogs: logs,
      currentWeek,
      scheduleType: savedSchedule,
      trainingMaxes,
      days,
      exerciseGroups,
      programVersions: versions,
      programMode: savedMode,
      pendingGeneratedWorkout: savedGenerated,
      initialized: true,
    });
  },

  setScheduleType: (type) => {
    const { trainingMaxes } = get();
    const days = buildInitialDays(type, trainingMaxes);
    set({ scheduleType: type, days });
    saveScheduleType(type);
    saveDayConfigs(days);
  },

  setCurrentWeek: (week) => {
    set({ currentWeek: week });
    saveCurrentWeek(week);
  },

  updateTrainingMax: (exerciseName, newTM) => {
    const tms = { ...get().trainingMaxes, [exerciseName]: newTM };
    const exerciseGroups = buildExerciseGroups(tms);
    set({ trainingMaxes: tms, exerciseGroups });
    saveTrainingMaxes(tms);
  },

  swapExercise: (dayIndex, exerciseId, newName) => {
    const days = get().days.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const mainLift = program.config.mainLifts.find((l) => l.name === newName);
          const auxLift = program.config.auxiliaries.find((l) => l.name === newName);
          const lift = mainLift || auxLift;
          return {
            ...ex,
            name: newName,
            id: `${dayIndex}-${ex.order}-${newName}`,
            trainingMax: get().trainingMaxes[newName] ?? lift?.trainingMax ?? 0,
            singleAt8Pct: lift?.singleAt8Pct ?? 0.9,
            category: lift ? ("main" as const) : PULL_EXERCISES.has(newName) ? ("pull" as const) : ("accessory" as const),
          };
        }),
      };
    });
    set({ days });
    saveDayConfigs(days);
  },

  reorderExercise: (dayIndex, fromIndex, toIndex) => {
    const days = get().days.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      const exercises = [...day.exercises];
      const [moved] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, moved);
      return { ...day, exercises: exercises.map((ex, i) => ({ ...ex, order: i })) };
    });
    set({ days });
    saveDayConfigs(days);
  },

  moveExercise: (fromDayIndex, exerciseId, toDayIndex) => {
    const days = get().days.map((day) => ({ ...day, exercises: [...day.exercises] }));
    const fromDay = days.find((d) => d.dayIndex === fromDayIndex);
    const toDay = days.find((d) => d.dayIndex === toDayIndex);
    if (!fromDay || !toDay || fromDayIndex === toDayIndex) return;

    const exIndex = fromDay.exercises.findIndex((ex) => ex.id === exerciseId);
    if (exIndex === -1) return;

    const [moved] = fromDay.exercises.splice(exIndex, 1);
    moved.id = `${toDayIndex}-${toDay.exercises.length}-${moved.name}`;
    toDay.exercises.push(moved);

    // Reindex orders
    fromDay.exercises.forEach((ex, i) => { ex.order = i; });
    toDay.exercises.forEach((ex, i) => { ex.order = i; });

    set({ days });
    saveDayConfigs(days);
  },

  resetDays: () => {
    const { scheduleType, trainingMaxes } = get();
    const days = buildInitialDays(scheduleType, trainingMaxes);
    const reclassified = reclassifyPulls(days);
    set({ days: reclassified });
    saveDayConfigs(reclassified);
  },

  setSupersetGroup: (dayIndex, exerciseId, group) => {
    const days = get().days.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, supersetGroup: group } : ex
        ),
      };
    });
    set({ days });
    saveDayConfigs(days);
  },

  startWorkout: (dayIndex) => {
    const { days, currentWeek, trainingMaxes } = get();
    const day = days[dayIndex];
    if (!day) return;

    const exercises = buildSbsLogEntries(day.exercises, currentWeek, trainingMaxes);

    set({
      activeWorkout: {
        id: `${currentWeek}-${dayIndex}-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        weekNumber: currentWeek,
        dayIndex,
        dayLabel: day.label,
        exercises,
        notes: "",
        completed: false,
        startedAt: new Date().toISOString(),
        completedAt: null,
      },
    });
  },

  logRepsOnLastSet: (exerciseId, reps) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, repsOnLastSet: reps, done: true } : ex
        ),
      },
    });
  },

  logAccessorySet: (exerciseId, setIndex, data) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId) return ex;
          const sets = [...ex.accessorySets];
          if (setIndex >= sets.length) {
            sets.push({ weight: null, reps: null, done: false, ...data });
          } else {
            sets[setIndex] = { ...sets[setIndex], ...data };
          }
          return { ...ex, accessorySets: sets };
        }),
      },
    });
  },

  toggleAccessoryDone: (exerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, done: !ex.done } : ex
        ),
      },
    });
  },

  addExerciseNote: (exerciseId, note) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, notes: note } : ex
        ),
      },
    });
  },

  setExerciseFeel: (exerciseId, feel) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, feel } : ex
        ),
      },
    });
  },

  completeWorkout: () => {
    const { activeWorkout, workoutLogs, trainingMaxes } = get();
    if (!activeWorkout) return;

    const completedWorkout: WorkoutLog = {
      ...activeWorkout,
      completed: true,
      completedAt: new Date().toISOString(),
    };

    const newTMs = applyWorkoutTmEffects(completedWorkout.exercises, {
      ...trainingMaxes,
    });

    const newLogs = [...workoutLogs, completedWorkout];
    const exerciseGroups = buildExerciseGroups(newTMs);
    set({ workoutLogs: newLogs, activeWorkout: null, trainingMaxes: newTMs, exerciseGroups });
    saveWorkoutLogs(newLogs);
    saveTrainingMaxes(newTMs);

    if (completedWorkout.mode === "random") {
      set({ pendingGeneratedWorkout: null });
      saveGeneratedWorkout(null);
    }
  },

  discardWorkout: () => {
    set({ activeWorkout: null });
  },

  saveVersion: (name) => {
    const { scheduleType, trainingMaxes, days, currentWeek, programVersions } = get();
    const version: ProgramVersion = {
      id: `v-${Date.now()}`,
      name,
      date: new Date().toISOString().split("T")[0],
      scheduleType,
      trainingMaxes: { ...trainingMaxes },
      dayConfigs: JSON.parse(JSON.stringify(days)),
      currentWeek,
    };
    const newVersions = [...programVersions, version];
    set({ programVersions: newVersions });
    saveProgramVersions(newVersions);
  },

  loadVersion: (versionId) => {
    const { programVersions } = get();
    const version = programVersions.find((v) => v.id === versionId);
    if (!version) return;

    const exerciseGroups = buildExerciseGroups(version.trainingMaxes);
    set({
      scheduleType: version.scheduleType,
      trainingMaxes: version.trainingMaxes,
      days: version.dayConfigs,
      currentWeek: version.currentWeek,
      exerciseGroups,
    });
    saveScheduleType(version.scheduleType);
    saveTrainingMaxes(version.trainingMaxes);
    saveDayConfigs(version.dayConfigs);
    saveCurrentWeek(version.currentWeek);
  },

  deleteVersion: (versionId) => {
    const newVersions = get().programVersions.filter((v) => v.id !== versionId);
    set({ programVersions: newVersions });
    saveProgramVersions(newVersions);
  },

  getPrescription: (exerciseName, trainingMax, singleAt8Pct) => {
    const { currentWeek } = get();
    return prescribeExercise(exerciseName, trainingMax, singleAt8Pct, currentWeek, program.weekSchedule, program.config.rounding);
  },

  // --- Randomized mode ---

  setProgramMode: (mode) => {
    set({ programMode: mode });
    saveProgramMode(mode);
  },

  generateRandomWorkout: (dayType, anchor) => {
    const { workoutLogs, trainingMaxes } = get();
    const gw = generateWorkout(
      dayType,
      makeGeneratorInputs(workoutLogs, trainingMaxes),
      anchor
    );
    set({ pendingGeneratedWorkout: gw });
    saveGeneratedWorkout(gw);
  },

  rerollRandomWorkout: () => {
    const { pendingGeneratedWorkout, workoutLogs, trainingMaxes } = get();
    if (!pendingGeneratedWorkout) return;
    const gw = rerollWorkout(
      pendingGeneratedWorkout,
      makeGeneratorInputs(workoutLogs, trainingMaxes)
    );
    set({ pendingGeneratedWorkout: gw });
    saveGeneratedWorkout(gw);
  },

  rerollGeneratedSlot: (slotKey) => {
    const { pendingGeneratedWorkout, workoutLogs, trainingMaxes } = get();
    if (!pendingGeneratedWorkout) return;
    const gw = rerollSlot(
      pendingGeneratedWorkout,
      slotKey,
      makeGeneratorInputs(workoutLogs, trainingMaxes)
    );
    set({ pendingGeneratedWorkout: gw });
    saveGeneratedWorkout(gw);
  },

  setGeneratedAnchor: (pattern) => {
    const { pendingGeneratedWorkout, workoutLogs, trainingMaxes } = get();
    if (!pendingGeneratedWorkout) return;
    const gw = setWorkoutAnchor(
      pendingGeneratedWorkout,
      pattern,
      makeGeneratorInputs(workoutLogs, trainingMaxes)
    );
    set({ pendingGeneratedWorkout: gw });
    saveGeneratedWorkout(gw);
  },

  setGeneratedSlotExercise: (slotKey, exerciseId) => {
    const { pendingGeneratedWorkout, workoutLogs, trainingMaxes } = get();
    const exercise = poolById.get(exerciseId);
    if (!pendingGeneratedWorkout || !exercise) return;
    const gw = setSlotExercise(
      pendingGeneratedWorkout,
      slotKey,
      exercise,
      makeGeneratorInputs(workoutLogs, trainingMaxes)
    );
    set({ pendingGeneratedWorkout: gw });
    saveGeneratedWorkout(gw);
  },

  discardGeneratedWorkout: () => {
    set({ pendingGeneratedWorkout: null });
    saveGeneratedWorkout(null);
  },

  startGeneratedWorkout: () => {
    const { pendingGeneratedWorkout: gw, trainingMaxes } = get();
    if (!gw) return;
    const exercises = buildGeneratedLogEntries(gw, trainingMaxes);
    set({
      activeWorkout: {
        id: `rand-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        weekNumber: 0,
        dayIndex: -1,
        dayLabel: gw.label,
        exercises,
        notes: "",
        completed: false,
        startedAt: new Date().toISOString(),
        completedAt: null,
        mode: "random",
        dayType: gw.dayType,
      },
    });
  },
}));
