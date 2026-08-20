import type {
  WorkoutLog,
  ExerciseLogEntry,
  PoolExercise,
  ExercisePoolFile,
  TemplateSlot,
  GeneratedSlot,
  GeneratedWorkout,
  MovementPattern,
  DayType,
} from "./types";
import { findClosestIntensity } from "./sbs";

// ---------------------------------------------------------------------------
// Seeded RNG — picks are persisted on the generated plan, so the seed is only
// for debuggability, but keeping generation deterministic per seed makes the
// whole module testable.
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedPick<T>(
  items: T[],
  weightFn: (item: T) => number,
  rng: () => number
): T | null {
  if (items.length === 0) return null;
  const weights = items.map((i) => Math.max(weightFn(i), 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Recency — derived entirely from workout logs. Logs are ground truth:
// generated-but-skipped plans never count as "used", rerolls change nothing,
// and imported logs feed recency automatically. The training-day index is
// history-relative, so skipped or extra calendar days can't break anything.
// ---------------------------------------------------------------------------

export interface RecencyState {
  trainingDayCount: number;
  lastUsedDay: Record<string, number>; // exercise id -> training-day index
  lastAnchorDay: Partial<Record<MovementPattern, number>>;
  exposureCount: Record<string, number>; // exercise id -> # of TM exposures
}

const ANCHOR_SET = new Set<MovementPattern>(["squat", "bench", "deadlift", "ohp"]);

function entryPerformed(entry: ExerciseLogEntry): boolean {
  if (entry.slotRole === "fixed") return false;
  return (
    entry.repsOnLastSet != null ||
    entry.accessorySets.some(
      (s) => s.done || (s.weight != null && s.reps != null)
    ) ||
    entry.done
  );
}

// Random-mode day labels name the day after its anchor pattern.
const LABEL_TO_ANCHOR: Record<string, MovementPattern> = {
  "squat day": "squat",
  "bench day": "bench",
  "deadlift day": "deadlift",
  "ohp day": "ohp",
};

export function buildRecency(
  logs: WorkoutLog[],
  pool: ExercisePoolFile
): RecencyState {
  const nameToEx = new Map(pool.exercises.map((e) => [e.name, e]));
  const completed = logs
    .filter((l) => l.completed)
    .sort((a, b) =>
      (a.completedAt ?? a.startedAt ?? a.date).localeCompare(
        b.completedAt ?? b.startedAt ?? b.date
      )
    );

  const lastUsedDay: Record<string, number> = {};
  const lastAnchorDay: Partial<Record<MovementPattern, number>> = {};
  const exposureCount: Record<string, number> = {};
  let dayIndex = 0;

  for (const log of completed) {
    // Rest days never advance the training-day index, so they neither block
    // nor unblock lift choices.
    if (log.dayType === "rest") continue;
    const performed = log.exercises.filter(entryPerformed);
    // A day only counts as a training day if some performed lift maps to the
    // pool — recovery-only logs (imported rest days without a dayType, foam
    // rolling checklists) must not advance the index.
    if (!performed.some((e) => nameToEx.has(e.exerciseName))) continue;
    const i = dayIndex++;

    let anchorAssigned = false;
    // The label is authoritative for random-mode days: the actual main may
    // have been subbed to a lift the pool can't map (unknown or retired), in
    // which case entry inference would attribute the day to the wrong pattern.
    if ((log.mode ?? "sbs") === "random") {
      const labeled = LABEL_TO_ANCHOR[(log.dayLabel ?? "").toLowerCase()];
      if (labeled) {
        lastAnchorDay[labeled] = i;
        anchorAssigned = true;
      }
    }
    for (const entry of performed) {
      const ex = nameToEx.get(entry.exerciseName);
      if (!ex) continue;
      lastUsedDay[ex.id] = i;
      if (entry.repsOnLastSet != null) {
        exposureCount[ex.id] = (exposureCount[ex.id] ?? 0) + 1;
      }
      // Random-mode logs tag the main slot explicitly; for legacy SBS logs the
      // first main-category lift of the day is the closest analogue.
      const isAnchor =
        entry.slotRole === "main" ||
        (entry.slotRole === undefined && entry.category === "main" && !anchorAssigned);
      if (isAnchor && ANCHOR_SET.has(ex.pattern)) {
        lastAnchorDay[ex.pattern] = i;
        anchorAssigned = true;
      }
    }
  }

  return { trainingDayCount: dayIndex, lastUsedDay, lastAnchorDay, exposureCount };
}

function gapFor(id: string, recency: RecencyState): number {
  const last = recency.lastUsedDay[id];
  return last == null ? Number.POSITIVE_INFINITY : recency.trainingDayCount - last;
}

// ---------------------------------------------------------------------------
// Prescription helpers
// ---------------------------------------------------------------------------

export function isLightExercise(ex: PoolExercise): boolean {
  return (
    ex.lightEligible ??
    (ex.equipment === "kettlebell" || ex.equipment === "bodyweight")
  );
}

// Deterministic ascending rotation through the exercise's intensity band,
// indexed by exposure count — per-exposure wave loading, replay-safe.
export function chooseIntensity(
  ex: PoolExercise,
  exposures: number,
  pool: ExercisePoolFile
): number {
  const band = ex.intensityBand ?? pool.defaults.intensityBand;
  const lo = findClosestIntensity(band[0], pool.intensityLevels);
  const hi = findClosestIntensity(band[1], pool.intensityLevels);
  const levels = pool.intensityLevels.filter((l) => l >= lo - 1e-9 && l <= hi + 1e-9);
  if (levels.length === 0) return lo;
  return levels[exposures % levels.length];
}

export function repTargetsFor(
  intensity: number,
  pool: ExercisePoolFile
): { reps: number; repOutTarget: number } {
  const key = String(findClosestIntensity(intensity, pool.intensityLevels));
  return {
    reps: pool.defaults.normalRepTargets[key] ?? 10,
    repOutTarget: pool.defaults.lastSetRepTargets[key] ?? 12,
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const DAY_LABELS: Partial<Record<MovementPattern, string>> = {
  squat: "Squat Day",
  bench: "Bench Day",
  deadlift: "Deadlift Day",
  ohp: "OHP Day",
};

interface GenerateContext {
  dayType: DayType;
  seed: number;
  logs: WorkoutLog[];
  pool: ExercisePoolFile;
  trainingMaxes: Record<string, number>;
  createdAt: string;
  excluded?: string[];
  // Forced anchor pattern (user override, or preserved across rerolls).
  anchor?: MovementPattern | null;
  anchorIsOverride?: boolean;
  // Slots preserved verbatim (matched by slot key).
  keep?: GeneratedSlot[];
  // For single-slot rerolls: exclude the current occupant so the reroll
  // visibly changes (dropped first if it empties the candidate set).
  exclude?: { slotKey: string; ids: string[] } | null;
}

function slotCategory(
  role: TemplateSlot["role"],
  hasTM: boolean
): "main" | "pull" | "accessory" {
  if (role === "main" || role === "aux") return hasTM ? "main" : "accessory";
  if (role === "pull") return "pull";
  return "accessory";
}

// Within-week freshness: at the strictest relaxation rung, anything used in
// the last RECENT_WINDOW training days is not a candidate. With ~4 sessions a
// week this makes "no repeats this week" the default while thin pools still
// relax gracefully.
const RECENT_WINDOW = 3;

interface Relax {
  noRecentWindow: boolean;
  noExclude: boolean;
  noDistinctPool: boolean;
  anyRelation: boolean;
  noConsecutive: boolean;
}

function candidatesForSlot(
  slot: TemplateSlot,
  anchor: MovementPattern | null,
  picked: Set<string>,
  pickedPatterns: Set<MovementPattern>,
  usedPools: Set<string>,
  excluded: Set<string>,
  excludeIds: Set<string>,
  recency: RecencyState,
  pool: ExercisePoolFile,
  relax: Relax
): PoolExercise[] {
  const relation = relax.anyRelation ? "any" : slot.relation ?? "same-pattern";
  return pool.exercises.filter((ex) => {
    if (slot.role === "fixed") return false;
    if (!ex.roles.includes(slot.role)) return false;
    // User-removed lifts are never candidates, at any relaxation level.
    if (excluded.has(ex.id)) return false;
    if (slot.lightOnly && !isLightExercise(ex)) return false;
    if (picked.has(ex.id)) return false;
    if (!relax.noExclude && excludeIds.has(ex.id)) return false;
    // Hard constraint: never the same exact lift on consecutive training days.
    if (!relax.noConsecutive && gapFor(ex.id, recency) === 1) return false;
    // Soft constraint (first rung only): nothing used within the last
    // RECENT_WINDOW training days — keeps rerolls and fresh generations from
    // serving this week's lifts while alternatives exist.
    if (!relax.noRecentWindow && gapFor(ex.id, recency) < RECENT_WINDOW) return false;

    if (slot.role === "main") {
      if (anchor && ex.pattern !== anchor) return false;
    }
    if (slot.role === "aux" && anchor && relation !== "any") {
      if (relation === "distinct") {
        if (ex.pattern === anchor || pickedPatterns.has(ex.pattern)) return false;
      } else {
        const allowed =
          relation === "complementary"
            ? pool.complementaryPatterns[anchor] ?? []
            : [anchor];
        if (!allowed.includes(ex.pattern)) return false;
      }
    }
    if (slot.role === "pull" || slot.role === "accessory") {
      if (slot.pools && (!ex.accessoryPool || !slot.pools.includes(ex.accessoryPool))) {
        return false;
      }
      // excludePools stays hard at every relaxation level — the abs slot must
      // be the only source of ab work.
      if (slot.excludePools && ex.accessoryPool && slot.excludePools.includes(ex.accessoryPool)) {
        return false;
      }
      if (
        !relax.noDistinctPool &&
        slot.distinctGroup &&
        ex.accessoryPool &&
        usedPools.has(ex.accessoryPool)
      ) {
        return false;
      }
    }
    return true;
  });
}

// Relaxation ladder: constraints are dropped one at a time until candidates
// exist. Optional slots are dropped instead of relaxing past the aux-relation
// step; the no-consecutive constraint is only ever broken deterministically
// (largest gap = repeats as late as possible), never randomly.
function pickForSlot(
  slot: TemplateSlot,
  anchor: MovementPattern | null,
  picked: Set<string>,
  pickedPatterns: Set<MovementPattern>,
  usedPools: Set<string>,
  excluded: Set<string>,
  excludeIds: Set<string>,
  recency: RecencyState,
  pool: ExercisePoolFile,
  rng: () => number
): PoolExercise | null {
  const ladder: Relax[] = [
    // 1: fully strict — fresh lifts only (nothing from the last 3 training days)
    { noRecentWindow: false, noExclude: false, noDistinctPool: false, anyRelation: false, noConsecutive: false },
    // 2: allow recent (but never consecutive-day) lifts
    { noRecentWindow: true, noExclude: false, noDistinctPool: false, anyRelation: false, noConsecutive: false },
    // 3+: progressively drop reroll-history, pool-distinctness, aux relation
    { noRecentWindow: true, noExclude: true, noDistinctPool: false, anyRelation: false, noConsecutive: false },
    { noRecentWindow: true, noExclude: true, noDistinctPool: true, anyRelation: false, noConsecutive: false },
    { noRecentWindow: true, noExclude: true, noDistinctPool: true, anyRelation: true, noConsecutive: false },
  ];
  // Optional slots drop rather than relax their pattern relation — a second
  // aux should never duplicate a pattern just to fill the slot.
  const rungs = slot.optional ? ladder.slice(0, 4) : ladder;
  for (const relax of rungs) {
    const candidates = candidatesForSlot(
      slot, anchor, picked, pickedPatterns, usedPools, excluded, excludeIds, recency, pool, relax
    );
    if (candidates.length > 0) {
      if (slot.selection === "lru") {
        // Deterministic: the least-recently-used candidate wins, so exposures
        // space out evenly and each lift's TM wave advances at a steady
        // cadence. Ties (e.g. never-used lifts) break randomly.
        const maxGap = Math.max(...candidates.map((ex) => gapFor(ex.id, recency)));
        const tied = candidates.filter((ex) => gapFor(ex.id, recency) === maxGap);
        return tied[Math.floor(rng() * tied.length)];
      }
      const cap = Math.max(8, 2 * candidates.length);
      return weightedPick(
        candidates,
        (ex) =>
          Math.min(gapFor(ex.id, recency), cap) ** 2 * (ex.frequencyBoost ?? 1),
        rng
      );
    }
  }
  if (slot.optional) return null;
  // Last resort: allow a consecutive-day repeat, choosing the least-recently
  // used candidate.
  const candidates = candidatesForSlot(slot, anchor, picked, pickedPatterns, usedPools, excluded, excludeIds, recency, pool, {
    noRecentWindow: true,
    noExclude: true,
    noDistinctPool: true,
    anyRelation: true,
    noConsecutive: true,
  });
  if (candidates.length === 0) return null;
  const cap = Math.max(8, 2 * candidates.length);
  return candidates.reduce((best, ex) =>
    Math.min(gapFor(ex.id, recency), cap) > Math.min(gapFor(best.id, recency), cap) ? ex : best
  );
}

// Superset post-pass: clear all groups, then pair accessory-circuit picks
// that share a tag. Clearing first prevents stale labels surviving on kept
// slots whose partner was rerolled or swapped away.
function applySupersetGroups(slots: GeneratedSlot[], pool: ExercisePoolFile): void {
  const idToTag = new Map(pool.exercises.map((e) => [e.id, e.supersetTag]));
  const byTag = new Map<string, GeneratedSlot[]>();
  for (const s of slots) {
    s.supersetGroup = null;
    if (s.role !== "accessory" || !s.exerciseId) continue;
    const tag = idToTag.get(s.exerciseId);
    if (!tag) continue;
    const group = byTag.get(tag) ?? [];
    group.push(s);
    byTag.set(tag, group);
  }
  let groupLabel = "A".charCodeAt(0);
  for (const group of byTag.values()) {
    if (group.length < 2) continue;
    const label = String.fromCharCode(groupLabel++);
    for (const s of group) s.supersetGroup = label;
  }
}

// Continue the cycle from the most recently anchored pattern — indexed by
// workouts completed, never by calendar, so missed or extra days just pick up
// where the cycle left off. An overridden day also advances the cycle from
// its pattern.
function pickRotationAnchor(
  pool: ExercisePoolFile,
  recency: RecencyState,
  viable: MovementPattern[]
): MovementPattern {
  let lastIdx = -1;
  let lastDay = -1;
  pool.anchorPatterns.forEach((p, i) => {
    const day = recency.lastAnchorDay[p];
    if (day != null && day > lastDay) {
      lastDay = day;
      lastIdx = i;
    }
  });
  const n = pool.anchorPatterns.length;
  for (let step = 1; step <= n; step++) {
    const candidate = pool.anchorPatterns[(lastIdx + step) % n];
    if (viable.length === 0 || viable.includes(candidate)) {
      return candidate;
    }
  }
  return pool.anchorPatterns[(lastIdx + 1) % n];
}

// What the cycle will serve next (for display). Null when not rotating.
export function nextCycleAnchor(inputs: GeneratorInputs): MovementPattern | null {
  const pool = inputs.pool;
  if ((pool.anchorMode ?? "random") !== "rotate") return null;
  const recency = buildRecency(inputs.logs, pool);
  const excluded = new Set(inputs.excluded ?? []);
  const viable = pool.anchorPatterns.filter((p) =>
    pool.exercises.some(
      (ex) =>
        ex.roles.includes("main") &&
        ex.pattern === p &&
        !excluded.has(ex.id) &&
        gapFor(ex.id, recency) !== 1
    )
  );
  return pickRotationAnchor(pool, recency, viable);
}

function generate(ctx: GenerateContext): GeneratedWorkout {
  const { pool, dayType } = ctx;
  const template = pool.dayTemplates.find((t) => t.id === dayType);
  if (!template) {
    throw new Error(`No day template for type "${dayType}"`);
  }
  const rng = mulberry32(ctx.seed);
  const recency = buildRecency(ctx.logs, pool);
  const keep = new Map((ctx.keep ?? []).map((s) => [s.slot, s]));
  const excludeIds = new Set(ctx.exclude?.ids ?? []);
  const excluded = new Set(ctx.excluded ?? []);

  const picked = new Set<string>();
  const pickedPatterns = new Set<MovementPattern>();
  const usedPools = new Set<string>();
  // Register kept slots first so constraints hold against them.
  for (const s of keep.values()) {
    if (s.exerciseId) picked.add(s.exerciseId);
    if (s.accessoryPool) usedPools.add(s.accessoryPool);
    if ((s.role === "main" || s.role === "aux") && s.pattern) {
      pickedPatterns.add(s.pattern);
    }
  }

  // Anchor pattern: forced, rotated, or recency-weighted random. An unforced
  // pick only considers patterns with at least one main-role lift that clears
  // the no-consecutive constraint, so generation never has to break it — only
  // an explicit user override can force a repeat.
  let anchor: MovementPattern | null = null;
  if (dayType === "full") {
    if (ctx.anchor) {
      anchor = ctx.anchor;
    } else {
      const viable = pool.anchorPatterns.filter((p) =>
        pool.exercises.some(
          (ex) =>
            ex.roles.includes("main") &&
            ex.pattern === p &&
            !excluded.has(ex.id) &&
            !picked.has(ex.id) &&
            gapFor(ex.id, recency) !== 1
        )
      );
      if ((pool.anchorMode ?? "random") === "rotate") {
        anchor = pickRotationAnchor(pool, recency, viable);
      } else {
        const cap = 8;
        anchor = weightedPick(
          viable.length > 0 ? viable : pool.anchorPatterns,
          (p) => {
            const last = recency.lastAnchorDay[p];
            const gap = last == null ? cap : recency.trainingDayCount - last;
            return Math.min(gap, cap) ** 2;
          },
          rng
        );
      }
    }
  }

  const slots: GeneratedSlot[] = [];
  let order = 0;
  for (const tSlot of template.slots) {
    const kept = keep.get(tSlot.slot);
    if (kept) {
      slots.push({ ...kept, order: order++ });
      continue;
    }
    // Flexible accessory count: skip this slot if the day already has enough
    // exercises (more aux lifts -> fewer circuit "others").
    if (
      tSlot.maxTotal != null &&
      slots.filter((s) => s.role !== "fixed").length >= tSlot.maxTotal
    ) {
      continue;
    }
    if (tSlot.role === "fixed") {
      slots.push({
        slot: tSlot.slot,
        role: "fixed",
        exerciseId: null,
        exerciseName: tSlot.fixed?.name ?? tSlot.slot,
        category: "accessory",
        pattern: null,
        accessoryPool: null,
        supersetGroup: null,
        intensity: null,
        calibration: false,
        locked: false,
        order: order++,
      });
      continue;
    }

    const slotExclude = ctx.exclude?.slotKey === tSlot.slot ? excludeIds : new Set<string>();
    const pick = pickForSlot(
      tSlot, anchor, picked, pickedPatterns, usedPools, excluded, slotExclude, recency, pool, rng
    );
    if (!pick) continue;

    picked.add(pick.id);
    if (pick.accessoryPool) usedPools.add(pick.accessoryPool);
    if (tSlot.role === "main" || tSlot.role === "aux") pickedPatterns.add(pick.pattern);

    const isTmSlot = tSlot.role === "main" || tSlot.role === "aux";
    // Light-day work is volume, not a TM exposure — no prescription even for
    // pattern-tagged lifts.
    const useTM = isTmSlot && dayType === "full";
    const hasTM = useTM && ctx.trainingMaxes[pick.name] != null;
    slots.push({
      slot: tSlot.slot,
      role: tSlot.role,
      exerciseId: pick.id,
      exerciseName: pick.name,
      category: slotCategory(tSlot.role, hasTM),
      pattern: pick.pattern,
      accessoryPool: pick.accessoryPool ?? null,
      supersetGroup: null,
      intensity: hasTM
        ? chooseIntensity(pick, recency.exposureCount[pick.id] ?? 0, pool)
        : null,
      calibration: useTM && !hasTM,
      locked: false,
      order: order++,
    });
  }

  // Enforce the day-size cap even when kept slots (anchor changes, rerolls of
  // plans made under a different aux count) push past it: trim unlocked
  // no-dedicated-pools "other" accessories from the end.
  if (template.maxExercises != null) {
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots.filter((s) => s.role !== "fixed").length <= template.maxExercises) break;
      const s = slots[i];
      const tSlot = template.slots.find((t) => t.slot === s.slot);
      if (s.role === "accessory" && !s.locked && !tSlot?.pools) {
        slots.splice(i, 1);
      }
    }
    slots.forEach((s, i) => (s.order = i));
  }

  applySupersetGroups(slots, pool);

  const label =
    dayType === "full"
      ? (anchor && DAY_LABELS[anchor]) || "Full Workout"
      : template.label;

  return {
    id: `gen-${ctx.seed}`,
    createdAt: ctx.createdAt,
    dayType,
    label,
    anchorPattern: anchor,
    anchorOverride: ctx.anchorIsOverride ?? false,
    trainingDayIndex: recency.trainingDayCount,
    seed: ctx.seed,
    slots,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratorInputs {
  logs: WorkoutLog[];
  pool: ExercisePoolFile;
  trainingMaxes: Record<string, number>;
  seed: number;
  createdAt: string;
  // Exercise ids the user has removed from the pool (never candidates).
  excluded?: string[];
}

export function generateWorkout(
  dayType: DayType,
  inputs: GeneratorInputs,
  anchorOverride?: MovementPattern | null
): GeneratedWorkout {
  return generate({
    dayType,
    ...inputs,
    anchor: anchorOverride ?? null,
    anchorIsOverride: anchorOverride != null,
  });
}

// Whole-workout reroll: fresh seed, preserves locked slots and any anchor
// override. With no override, a locked (manually swapped) main lift pins the
// anchor to its own pattern — re-picking freely would produce e.g. a "Bench
// Day" whose kept main is a squat, with bench auxiliaries around it.
export function rerollWorkout(
  gw: GeneratedWorkout,
  inputs: GeneratorInputs
): GeneratedWorkout {
  const keep = gw.slots.filter((s) => s.locked);
  const lockedMain = keep.find(
    (s) => s.role === "main" && s.pattern && ANCHOR_SET.has(s.pattern)
  );
  return generate({
    dayType: gw.dayType,
    ...inputs,
    anchor: gw.anchorOverride ? gw.anchorPattern : lockedMain?.pattern ?? null,
    anchorIsOverride: gw.anchorOverride,
    keep,
  });
}

// Single-slot reroll: every other slot is kept. Successive rerolls of the
// same slot accumulate an exclusion history — without it, deterministic LRU
// selection makes repeated presses flip-flop between the two least-recently
// used lifts and nothing else ever surfaces. With it, each press serves the
// next-least-recently-used candidate until the eligible list is exhausted;
// the relaxation ladder then ignores the history (the pick lands on an
// already-seen id), which we detect and treat as the start of a new cycle.
// Manual swaps (setSlotExercise) reset the cycle.
export function rerollSlot(
  gw: GeneratedWorkout,
  slotKey: string,
  inputs: GeneratorInputs
): GeneratedWorkout {
  const current = gw.slots.find((s) => s.slot === slotKey);
  const excludeIds = [
    ...(current?.exerciseId ? [current.exerciseId] : []),
    ...(current?.rerollHistory ?? []).filter((id) => id !== current?.exerciseId),
  ];
  const next = generate({
    dayType: gw.dayType,
    ...inputs,
    anchor: gw.anchorPattern,
    anchorIsOverride: gw.anchorOverride,
    keep: gw.slots.filter((s) => s.slot !== slotKey),
    exclude: excludeIds.length > 0 ? { slotKey, ids: excludeIds } : null,
  });
  const landed = next.slots.find((s) => s.slot === slotKey);
  if (landed?.exerciseId) {
    landed.rerollHistory = excludeIds.includes(landed.exerciseId)
      ? (current?.exerciseId ? [current.exerciseId] : [])
      : excludeIds;
  }
  return next;
}

// Manual anchor override: main + aux slots regenerate (they are
// anchor-dependent); pull and circuit slots are kept. Passing null clears the
// override and re-picks the anchor at random.
export function setWorkoutAnchor(
  gw: GeneratedWorkout,
  pattern: MovementPattern | null,
  inputs: GeneratorInputs
): GeneratedWorkout {
  return generate({
    dayType: gw.dayType,
    ...inputs,
    anchor: pattern,
    anchorIsOverride: pattern != null,
    keep: gw.slots.filter((s) => s.role !== "main" && s.role !== "aux"),
  });
}

// Replace one slot's exercise by hand (from the swap screen). The slot is
// marked locked so whole-workout rerolls keep it.
export function setSlotExercise(
  gw: GeneratedWorkout,
  slotKey: string,
  exercise: PoolExercise,
  inputs: GeneratorInputs
): GeneratedWorkout {
  const recency = buildRecency(inputs.logs, inputs.pool);
  const slots = gw.slots.map((s) => {
    if (s.slot !== slotKey) return { ...s };
    const isTmSlot = s.role === "main" || s.role === "aux";
    const useTM = isTmSlot && gw.dayType === "full";
    const hasTM = useTM && inputs.trainingMaxes[exercise.name] != null;
    return {
      ...s,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: slotCategory(s.role, hasTM),
      pattern: exercise.pattern,
      accessoryPool: exercise.accessoryPool ?? null,
      intensity: hasTM
        ? chooseIntensity(exercise, recency.exposureCount[exercise.id] ?? 0, inputs.pool)
        : null,
      calibration: useTM && !hasTM,
      locked: true,
      rerollHistory: undefined,
    };
  });
  // Re-pair supersets: the swapped-in exercise may create or break a pairing,
  // and the replaced slot must not inherit its predecessor's group.
  applySupersetGroups(slots, inputs.pool);
  return { ...gw, slots };
}

// Candidates for the swap screen, in two tiers. Swap is a semantic query, not
// a rotation-queue peek: "this station is taken / this bar feels wrong, give
// me an equivalent movement."
//
// - sameMovement: every pool exercise sharing the occupant's movement tag —
//   any role, any pattern, rotation/consecutive-day state ignored — ranked
//   least-recently-used first. Swapping across roles is deliberate (a taken
//   BSS station can become a hack squat even though one is main and the other
//   aux); setSlotExercise already handles TM/calibration for whatever lands.
// - others: the old role-based menu for the slot (minus tier one), so every
//   legal fallback is still reachable.
//
// The rotation queue itself is untouched — it still drives default
// programming; only manual swaps bypass it.
export interface SwapOptions {
  sameMovement: PoolExercise[];
  others: PoolExercise[];
}

export function swapCandidates(
  gw: GeneratedWorkout,
  slotKey: string,
  inputs: GeneratorInputs
): SwapOptions {
  const template = inputs.pool.dayTemplates.find((t) => t.id === gw.dayType);
  const tSlot = template?.slots.find((s) => s.slot === slotKey);
  const current = gw.slots.find((s) => s.slot === slotKey);
  if (!tSlot || tSlot.role === "fixed") return { sameMovement: [], others: [] };

  const recency = buildRecency(inputs.logs, inputs.pool);
  const excluded = new Set(inputs.excluded ?? []);
  const picked = new Set<string>();
  const pickedPatterns = new Set<MovementPattern>();
  const usedPools = new Set<string>();
  for (const s of gw.slots) {
    if (s.slot === slotKey) continue;
    if (s.exerciseId) picked.add(s.exerciseId);
    if (s.accessoryPool) usedPools.add(s.accessoryPool);
    if ((s.role === "main" || s.role === "aux") && s.pattern) pickedPatterns.add(s.pattern);
  }
  const byGap = (a: PoolExercise, b: PoolExercise) =>
    gapFor(b.id, recency) - gapFor(a.id, recency);

  const currentEx = current?.exerciseId
    ? inputs.pool.exercises.find((e) => e.id === current.exerciseId)
    : undefined;
  // Within-day duplicate, light-day, and removed-from-pool filters stay hard
  // even here — everything else is the lifter's call.
  const sameMovement = currentEx
    ? inputs.pool.exercises
        .filter(
          (ex) =>
            ex.movement === currentEx.movement &&
            ex.id !== currentEx.id &&
            !picked.has(ex.id) &&
            !excluded.has(ex.id) &&
            (!tSlot.lightOnly || isLightExercise(ex))
        )
        .sort(byGap)
    : [];
  const sameIds = new Set(sameMovement.map((e) => e.id));

  const others = candidatesForSlot(
    tSlot,
    gw.anchorPattern,
    picked,
    pickedPatterns,
    usedPools,
    excluded,
    new Set(current?.exerciseId ? [current.exerciseId] : []),
    recency,
    inputs.pool,
    { noRecentWindow: true, noExclude: false, noDistinctPool: true, anyRelation: true, noConsecutive: true }
  )
    .filter((ex) => !sameIds.has(ex.id))
    .sort(byGap);

  return { sameMovement, others };
}
