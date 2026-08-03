// One-off sanity harness for the movement-tag swap query (run: npx tsx scripts/swap-sanity.ts)
import { generateWorkout, swapCandidates } from "../lib/generator";
import type { ExercisePoolFile } from "../lib/types";
import poolData from "../data/exercises.json";

const pool = poolData as unknown as ExercisePoolFile;
const inputs = {
  logs: [],
  pool,
  trainingMaxes: { "Bulgarian Split Squat": 90, "Overhead Press": 126 },
  seed: 42,
  createdAt: "2026-08-02T00:00:00Z",
};

for (const anchor of ["squat", "ohp"] as const) {
  const gw = generateWorkout("full", inputs, anchor);
  console.log(`\n=== ${gw.label} ===`);
  for (const slot of gw.slots) {
    if (slot.role === "fixed") continue;
    const { sameMovement, others } = swapCandidates(gw, slot.slot, inputs);
    console.log(
      `${slot.slot.padEnd(5)} ${slot.exerciseName.padEnd(28)} same: [${sameMovement
        .map((e) => e.name)
        .join(", ")}]\n${" ".repeat(34)}others: [${others.map((e) => e.name).join(", ")}]`
    );
  }
}
