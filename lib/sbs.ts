import type { AutoregConfig, ProgramConfig, WeekConfig } from "./types";

/**
 * Round a weight to the nearest increment (e.g., 2.5 lbs).
 */
export function roundWeight(weight: number, rounding: number): number {
  return Math.round(weight / rounding) * rounding;
}

/**
 * Compute working weight for a given TM and intensity.
 */
export function workingWeight(
  trainingMax: number,
  intensity: number,
  rounding: number
): number {
  return roundWeight(trainingMax * intensity, rounding);
}

/**
 * Compute the single @8 weight (warm-up top single).
 */
export function singleAt8Weight(
  trainingMax: number,
  singleAt8Pct: number,
  rounding: number
): number {
  return roundWeight(trainingMax * singleAt8Pct, rounding);
}

/**
 * Determine the TM adjustment percentage based on last-set reps vs target.
 *
 * The SBS autoregulation system:
 * - Below target by 2+: large decrease (-5%)
 * - Below by 1: small decrease (-2%)
 * - Hit target exactly: no change
 * - Beat by 1-4: progressive increase (0.5% to 2%)
 * - Beat by 5+: largest increase (3%)
 */
export function tmAdjustmentPct(
  repsOnLastSet: number,
  repOutTarget: number,
  autoreg: AutoregConfig
): number {
  const diff = repsOnLastSet - repOutTarget;
  const adj = autoreg.adjustments;

  if (diff <= -2) return adj.below_by_2plus;
  if (diff === -1) return adj.below_by_1;
  if (diff === 0) return adj.hit_target;
  if (diff === 1) return adj.beat_by_1;
  if (diff === 2) return adj.beat_by_2;
  if (diff === 3) return adj.beat_by_3;
  if (diff === 4) return adj.beat_by_4;
  // Beat by 5+: use the beat_by_4 value + 0.01 (from spreadsheet pattern: 0.03 total)
  // Actually the spreadsheet has a "Beat by 5+" column at 0.03 in the Setup sheet
  return 0.03;
}

/**
 * Compute new training max after a week's performance.
 */
export function newTrainingMax(
  currentTM: number,
  repsOnLastSet: number,
  repOutTarget: number,
  autoreg: AutoregConfig
): number {
  const pct = tmAdjustmentPct(repsOnLastSet, repOutTarget, autoreg);
  return currentTM * (1 + pct);
}

/**
 * Get the week config for a specific exercise and week.
 */
export function getWeekExerciseConfig(
  exerciseName: string,
  weekNumber: number,
  weekSchedule: WeekConfig[]
): { intensity: number; reps: number; repOutTarget: number; sets: number } | null {
  const week = weekSchedule.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;
  return week.exerciseConfigs[exerciseName] || null;
}

/**
 * Given a program config, compute the full prescribed workout for a given
 * exercise, week, and current TM.
 */
export function prescribeExercise(
  exerciseName: string,
  trainingMax: number,
  singleAt8Pct: number,
  weekNumber: number,
  weekSchedule: WeekConfig[],
  rounding: number
): {
  tmSingleWeight: number;
  workingWeight: number;
  reps: number;
  repOutTarget: number;
  sets: number;
} | null {
  const config = getWeekExerciseConfig(exerciseName, weekNumber, weekSchedule);
  if (!config) return null;

  return {
    tmSingleWeight: singleAt8Weight(trainingMax, singleAt8Pct, rounding),
    workingWeight: workingWeight(trainingMax, config.intensity, rounding),
    reps: config.reps,
    repOutTarget: config.repOutTarget,
    sets: config.sets,
  };
}

/**
 * Find the closest intensity level for rep target lookup.
 */
export function findClosestIntensity(
  intensity: number,
  levels: number[]
): number {
  let closest = levels[0];
  let minDiff = Math.abs(intensity - closest);
  for (const level of levels) {
    const diff = Math.abs(intensity - level);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }
  return closest;
}
