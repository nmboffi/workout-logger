import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutLog, ExerciseState, WorkoutDay, ProgramVersion } from "./types";

const KEYS = {
  WORKOUT_LOGS: "workout_logs",
  CURRENT_WEEK: "current_week",
  SCHEDULE_TYPE: "schedule_type",
  EXERCISE_STATE: "exercise_state",
  TRAINING_MAXES: "training_maxes",
  DAY_CONFIGS: "day_configs",
  PROGRAM_VERSIONS: "program_versions",
} as const;

export async function saveWorkoutLogs(logs: WorkoutLog[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
}

export async function loadWorkoutLogs(): Promise<WorkoutLog[]> {
  const data = await AsyncStorage.getItem(KEYS.WORKOUT_LOGS);
  return data ? JSON.parse(data) : [];
}

export async function saveCurrentWeek(week: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_WEEK, String(week));
}

export async function loadCurrentWeek(): Promise<number> {
  const data = await AsyncStorage.getItem(KEYS.CURRENT_WEEK);
  return data ? parseInt(data, 10) : 1;
}

export async function saveScheduleType(
  type: "(3+1)x" | "4x"
): Promise<void> {
  await AsyncStorage.setItem(KEYS.SCHEDULE_TYPE, type);
}

export async function loadScheduleType(): Promise<"(3+1)x" | "4x"> {
  const data = await AsyncStorage.getItem(KEYS.SCHEDULE_TYPE);
  return (data as "(3+1)x" | "4x") || "4x";
}

export async function saveTrainingMaxes(
  maxes: Record<string, number>
): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRAINING_MAXES, JSON.stringify(maxes));
}

export async function loadTrainingMaxes(): Promise<Record<string, number>> {
  const data = await AsyncStorage.getItem(KEYS.TRAINING_MAXES);
  return data ? JSON.parse(data) : {};
}

export async function saveDayConfigs(
  configs: WorkoutDay[]
): Promise<void> {
  await AsyncStorage.setItem(KEYS.DAY_CONFIGS, JSON.stringify(configs));
}

export async function loadDayConfigs(): Promise<WorkoutDay[] | null> {
  const data = await AsyncStorage.getItem(KEYS.DAY_CONFIGS);
  return data ? JSON.parse(data) : null;
}

export async function saveProgramVersions(
  versions: ProgramVersion[]
): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROGRAM_VERSIONS, JSON.stringify(versions));
}

export async function loadProgramVersions(): Promise<ProgramVersion[]> {
  const data = await AsyncStorage.getItem(KEYS.PROGRAM_VERSIONS);
  return data ? JSON.parse(data) : [];
}

export async function exportAllData(): Promise<string> {
  const keys = Object.values(KEYS);
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, unknown> = {};
  for (const [key, value] of pairs) {
    if (value) data[key] = JSON.parse(value);
  }
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString) as Record<string, unknown>;
  const pairs: [string, string][] = Object.entries(data).map(
    ([key, value]) => [key, JSON.stringify(value)]
  );
  await AsyncStorage.multiSet(pairs);
}
