// One-off sanity harness for the movement-tag swap query and reroll cycling
// (run: npx tsx scripts/swap-sanity.ts)
import { generateWorkout, rerollSlot, swapCandidates } from "../lib/generator";
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

// Reroll cycling: repeated rerolls of one slot must walk distinct exercises
// until the eligible list is exhausted, not flip-flop between two.
{
  let gw = generateWorkout("full", inputs, "squat");
  for (const slotKey of ["aux1", "acc1"]) {
    const seen: string[] = [];
    const start = gw.slots.find((s) => s.slot === slotKey)?.exerciseName;
    let cur = gw;
    for (let i = 0; i < 10; i++) {
      cur = rerollSlot(cur, slotKey, { ...inputs, seed: 1000 + i });
      seen.push(cur.slots.find((s) => s.slot === slotKey)?.exerciseName ?? "-");
    }
    const firstRepeat = seen.findIndex((n, i) => seen.indexOf(n) < i);
    const distinct = new Set(seen.slice(0, firstRepeat === -1 ? seen.length : firstRepeat)).size;
    console.log(`reroll ${slotKey}: start=${start} -> ${seen.join(" | ")}`);
    console.log(`  distinct before first repeat: ${distinct}`);
    if (distinct < 3) throw new Error(`${slotKey} still flip-flopping`);
  }
}

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
