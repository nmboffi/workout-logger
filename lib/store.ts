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
} from "./types";
import {
  newTrainingMax,
  prescribeExercise,
} from "./sbs";
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
} from "./storage";
import programData from "../data/program.json";

const program = programData as unknown as ProgramData;

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

  // Actions
  initialize: () => Promise<void>;
  setScheduleType: (type: ScheduleType) => void;
  setCurrentWeek: (week: number) => void;
  updateTrainingMax: (exerciseName: string, newTM: number) => void;

  // Day management
  swapExercise: (dayIndex: number, exerciseId: string, newName: string) => void;
  reorderExercise: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  setSupersetGroup: (dayIndex: number, exerciseId: string, group: string | null) => void;

  // Workout
  startWorkout: (dayIndex: number) => void;
  logRepsOnLastSet: (exerciseId: string, reps: number) => void;
  logAccessorySet: (exerciseId: string, setIndex: number, data: Partial<AccessorySet>) => void;
  toggleAccessoryDone: (exerciseId: string) => void;
  addExerciseNote: (exerciseId: string, note: string) => void;
  completeWorkout: () => void;
  discardWorkout: () => void;

  // Versioning
  saveVersion: (name: string) => void;
  loadVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

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
        category: ex.category as "main" | "accessory",
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

function inferCurrentWeek(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 1;
  const maxWeek = Math.max(...logs.map((l) => l.weekNumber));
  const template = program.templates["4x"];
  const logsThisWeek = logs.filter((l) => l.weekNumber === maxWeek);
  if (logsThisWeek.length >= (template?.length ?? 4)) {
    return Math.min(maxWeek + 1, 21);
  }
  return maxWeek;
}

function replayTrainingMaxes(
  logs: WorkoutLog[],
  baseTMs: Record<string, number>
): Record<string, number> {
  const tms = { ...baseTMs };
  const sortedLogs = [...logs].sort(
    (a, b) => a.weekNumber - b.weekNumber || a.dayIndex - b.dayIndex
  );
  for (const log of sortedLogs) {
    for (const entry of log.exercises) {
      if (entry.category === "main" && entry.repsOnLastSet !== null && entry.repOutTarget !== null) {
        const autoreg = program.config.autoregulation[entry.exerciseName];
        if (autoreg) {
          tms[entry.exerciseName] = newTrainingMax(tms[entry.exerciseName] ?? 0, entry.repsOnLastSet, entry.repOutTarget, autoreg);
        }
      }
    }
  }
  return tms;
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

  initialize: async () => {
    const [logs, savedWeek, savedSchedule, savedTMs, savedDays, versions] =
      await Promise.all([
        loadWorkoutLogs(),
        loadCurrentWeek(),
        loadScheduleType(),
        loadTrainingMaxes(),
        loadDayConfigs(),
        loadProgramVersions(),
      ]);

    const baseTMs = buildInitialTrainingMaxes();
    const trainingMaxes =
      Object.keys(savedTMs).length > 0 ? savedTMs : replayTrainingMaxes(logs, baseTMs);
    const currentWeek = logs.length > 0 ? inferCurrentWeek(logs) : savedWeek;
    const days = savedDays || buildInitialDays(savedSchedule, trainingMaxes);
    const exerciseGroups = buildExerciseGroups(trainingMaxes);

    set({
      workoutLogs: logs,
      currentWeek,
      scheduleType: savedSchedule,
      trainingMaxes,
      days,
      exerciseGroups,
      programVersions: versions,
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
            category: lift ? ("main" as const) : ("accessory" as const),
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

    const exercises: ExerciseLogEntry[] = day.exercises.map((ex) => {
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
          done: false,
        };
      }
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: "accessory" as const,
        prescribedWeight: null,
        prescribedReps: null,
        repOutTarget: null,
        sets: null,
        repsOnLastSet: null,
        tmSingleWeight: null,
        accessorySets: [
          { weight: null, reps: null, done: false },
          { weight: null, reps: null, done: false },
          { weight: null, reps: null, done: false },
        ],
        supersetGroup: ex.supersetGroup,
        notes: "",
        done: false,
      };
    });

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

  completeWorkout: () => {
    const { activeWorkout, workoutLogs, trainingMaxes } = get();
    if (!activeWorkout) return;

    const completedWorkout: WorkoutLog = {
      ...activeWorkout,
      completed: true,
      completedAt: new Date().toISOString(),
    };

    const newTMs = { ...trainingMaxes };
    for (const entry of completedWorkout.exercises) {
      if (entry.category === "main" && entry.repsOnLastSet !== null && entry.repOutTarget !== null) {
        const autoreg = program.config.autoregulation[entry.exerciseName];
        if (autoreg && newTMs[entry.exerciseName] != null) {
          newTMs[entry.exerciseName] = newTrainingMax(
            newTMs[entry.exerciseName],
            entry.repsOnLastSet,
            entry.repOutTarget,
            autoreg
          );
        }
      }
    }

    const newLogs = [...workoutLogs, completedWorkout];
    const exerciseGroups = buildExerciseGroups(newTMs);
    set({ workoutLogs: newLogs, activeWorkout: null, trainingMaxes: newTMs, exerciseGroups });
    saveWorkoutLogs(newLogs);
    saveTrainingMaxes(newTMs);
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
}));
