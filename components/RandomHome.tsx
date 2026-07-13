import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../lib/store";
import { workingWeight } from "../lib/sbs";
import { repTargetsFor } from "../lib/generator";
import { getLastPerformance, lastPerformanceLine } from "../lib/history";
import { colors, spacing, radius, font, shadow, DB_EXERCISES } from "../lib/theme";
import type { GeneratedSlot, MovementPattern } from "../lib/types";

function formatWeight(weight: number, exerciseName: string): string {
  if (DB_EXERCISES.has(exerciseName)) {
    return `${weight * 2} lbs (${weight} ea)`;
  }
  return `${weight} lbs`;
}

const PATTERN_META: Record<string, { label: string; color: string }> = {
  squat: { label: "Squat", color: "#C17A4A" },
  bench: { label: "Bench", color: "#B8893D" },
  deadlift: { label: "Dead", color: "#A07040" },
  ohp: { label: "OHP", color: "#9A944A" },
  pull: { label: "Pull", color: colors.pull },
};

const ANCHOR_OPTIONS: { value: MovementPattern | null; label: string }[] = [
  { value: null, label: "Auto" },
  { value: "squat", label: "Squat" },
  { value: "bench", label: "Bench" },
  { value: "deadlift", label: "Dead" },
  { value: "ohp", label: "OHP" },
];

function confirmWeb(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
  } else {
    require("react-native").Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: onConfirm },
    ]);
  }
}

export default function RandomHome() {
  const router = useRouter();
  const {
    workoutLogs,
    trainingMaxes,
    program,
    exercisePool,
    activeWorkout,
    pendingGeneratedWorkout: pending,
    generateRandomWorkout,
    rerollRandomWorkout,
    rerollGeneratedSlot,
    setGeneratedAnchor,
    discardGeneratedWorkout,
    startGeneratedWorkout,
    inboxNotice,
  } = useStore();

  const [anchorChoice, setAnchorChoice] = useState<MovementPattern | null>(null);

  const completedCount = workoutLogs.filter((l) => l.completed).length;
  // Rest days don't affect the generator's constraints, so they shouldn't
  // flag a pending plan as stale.
  const lastCompleted = workoutLogs
    .filter((l) => l.completed && l.completedAt && l.dayType !== "rest")
    .map((l) => l.completedAt as string)
    .sort()
    .pop();
  const stale = !!(pending && lastCompleted && lastCompleted > pending.createdAt);

  const handleStart = () => {
    if (activeWorkout) {
      confirmWeb(`You have an active ${activeWorkout.dayLabel} workout. Resume it?`, () =>
        router.push("/workout")
      );
      return;
    }
    startGeneratedWorkout();
    router.push("/workout");
  };

  const handleDiscard = () => {
    confirmWeb("Discard this generated workout?", discardGeneratedWorkout);
  };

  const slotCtx: SlotCtx = {
    workoutLogs,
    trainingMaxes,
    program,
    exercisePool,
    rerollGeneratedSlot,
    openSwap: (slotKey) =>
      router.push(`/swap?mode=random&slotKey=${encodeURIComponent(slotKey)}`),
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Randomized</Text>
        <Text style={styles.heroTitle}>{pending ? pending.label : "Today"}</Text>
        <View style={styles.heroPills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{completedCount} workouts logged</Text>
          </View>
          <TouchableOpacity
            style={[styles.pill, styles.pillAction]}
            onPress={() => router.push("/pool")}
          >
            <Text style={[styles.pillText, { color: colors.amber }]}>Edit Pool</Text>
          </TouchableOpacity>
        </View>
      </View>

      {inboxNotice && (
        <View style={styles.inboxNotice}>
          <Text style={styles.inboxNoticeText}>✓ {inboxNotice}</Text>
        </View>
      )}

      {/* Resume banner */}
      {activeWorkout && (
        <View style={styles.resumeBanner}>
          <TouchableOpacity
            style={styles.resumeMain}
            onPress={() => router.push("/workout")}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.resumeTitle}>Continue Workout</Text>
              <Text style={styles.resumeSubtitle}>{activeWorkout.dayLabel}</Text>
            </View>
            <View style={styles.resumeArrow}>
              <Text style={styles.resumeArrowText}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resumeDismiss}
            onPress={() =>
              confirmWeb("Discard this workout?", () => useStore.getState().discardWorkout())
            }
            hitSlop={8}
          >
            <Text style={styles.resumeDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {!pending ? (
        <View>
          {/* Anchor picker */}
          <Text style={styles.sectionHeading}>Focus</Text>
          <View style={styles.anchorRow}>
            {ANCHOR_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.anchorPill, anchorChoice === opt.value && styles.anchorPillActive]}
                onPress={() => setAnchorChoice(opt.value)}
              >
                <Text
                  style={[
                    styles.anchorPillText,
                    anchorChoice === opt.value && styles.anchorPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Generate buttons */}
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={() => generateRandomWorkout("full", anchorChoice)}
            activeOpacity={0.8}
          >
            <Text style={styles.generateBtnText}>Generate Workout</Text>
            <Text style={styles.generateBtnSub}>main · aux · pull · circuit</Text>
          </TouchableOpacity>
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => generateRandomWorkout("light")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>Light Day</Text>
              <Text style={styles.secondaryBtnSub}>KB / bodyweight + sauna</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => generateRandomWorkout("rest")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>Rest Day</Text>
              <Text style={styles.secondaryBtnSub}>foam roll + sauna</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.dayCard}>
          {/* Card header */}
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>{pending.label}</Text>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <TouchableOpacity onPress={rerollRandomWorkout} hitSlop={8}>
                <Text style={styles.headerAction}>↻ Reroll</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDiscard} hitSlop={8}>
                <Text style={[styles.headerAction, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {stale && (
            <View style={styles.staleBanner}>
              <Text style={styles.staleText}>
                Generated before your last workout — reroll to respect it.
              </Text>
            </View>
          )}

          {/* Anchor override (full days) */}
          {pending.dayType === "full" && (
            <View style={[styles.anchorRow, { marginBottom: spacing.lg }]}>
              {ANCHOR_OPTIONS.map((opt) => {
                const active = opt.value
                  ? pending.anchorOverride && pending.anchorPattern === opt.value
                  : !pending.anchorOverride;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.anchorPill, active && styles.anchorPillActive]}
                    onPress={() => {
                      // Re-tapping the active pill would regenerate main/aux
                      // for no reason and discard manual swaps.
                      if (!active) setGeneratedAnchor(opt.value);
                    }}
                  >
                    <Text style={[styles.anchorPillText, active && styles.anchorPillTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <SlotSection title="Main" color={colors.amber} slots={pending.slots.filter((s) => s.role === "main")} ctx={slotCtx} />
          <SlotSection title="Aux" color={colors.textSecondary} slots={pending.slots.filter((s) => s.role === "aux")} ctx={slotCtx} />
          <SlotSection title="Pull" color={colors.pull} slots={pending.slots.filter((s) => s.role === "pull")} ctx={slotCtx} />
          <SlotSection title="Circuit" color={colors.textMuted} slots={pending.slots.filter((s) => s.role === "accessory")} ctx={slotCtx} />
          <SlotSection title="Recovery" color={colors.green} slots={pending.slots.filter((s) => s.role === "fixed")} ctx={slotCtx} />

          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
            <Text style={styles.startBtnText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Everything SlotRow needs from the parent — passed explicitly so these can
// live at module scope (components defined inside a component are a new type
// every render, remounting the whole slot list on each store change).
interface SlotCtx {
  workoutLogs: ReturnType<typeof useStore.getState>["workoutLogs"];
  trainingMaxes: Record<string, number>;
  program: ReturnType<typeof useStore.getState>["program"];
  exercisePool: ReturnType<typeof useStore.getState>["exercisePool"];
  rerollGeneratedSlot: (slotKey: string) => void;
  openSwap: (slotKey: string) => void;
}

function SlotSection({
  title,
  color,
  slots,
  ctx,
}: {
  title: string;
  color: string;
  slots: GeneratedSlot[];
  ctx: SlotCtx;
}) {
  if (slots.length === 0) return null;
  return (
    <View style={styles.liftSection}>
      <View style={styles.sectionDivider} />
      <Text style={[styles.sectionLabel, { color }]}>{title}</Text>
      {slots.map((slot) => (
        <SlotRow key={slot.slot} slot={slot} ctx={ctx} />
      ))}
    </View>
  );
}

function SlotRow({ slot, ctx }: { slot: GeneratedSlot; ctx: SlotCtx }) {
  const meta = slot.pattern ? PATTERN_META[slot.pattern] : null;
  const tm = ctx.trainingMaxes[slot.exerciseName];
  const last = getLastPerformance(ctx.workoutLogs, slot.exerciseName);

  let rxLine: string | null = null;
  if (slot.category === "main" && slot.intensity != null && tm != null) {
    const weight = workingWeight(tm, slot.intensity, ctx.program.config.rounding);
    const targets = repTargetsFor(slot.intensity, ctx.exercisePool);
    rxLine = `${formatWeight(weight, slot.exerciseName)}  ·  ${targets.reps} reps  ·  rep out ${targets.repOutTarget}`;
  } else if (slot.calibration) {
    rxLine = "Calibration: work up to one hard set of 5-10 reps";
  }

  const isFixed = slot.role === "fixed";
  return (
    <TouchableOpacity
      style={styles.exerciseRow}
      disabled={isFixed}
      onPress={() => ctx.openSwap(slot.slot)}
      activeOpacity={0.6}
    >
      <View style={[styles.exerciseDot, meta && { backgroundColor: meta.color }]} />
      <View style={styles.exerciseInfo}>
        <View style={styles.auxNameRow}>
          <Text style={styles.exerciseName}>{slot.exerciseName}</Text>
          {meta && <Text style={[styles.auxCatTag, { color: meta.color }]}>{meta.label}</Text>}
          {slot.locked && <Text style={styles.lockTag}>manual</Text>}
          {slot.supersetGroup && (
            <Text style={styles.ssTag}>SS {slot.supersetGroup}</Text>
          )}
        </View>
        {rxLine && <Text style={styles.exerciseRx}>{rxLine}</Text>}
        {last && <Text style={styles.lastLine}>Last: {lastPerformanceLine(last)}</Text>}
      </View>
      {!isFixed && (
        <TouchableOpacity
          onPress={() => ctx.rerollGeneratedSlot(slot.slot)}
          hitSlop={10}
          style={styles.rerollBtn}
        >
          <Text style={styles.rerollBtnText}>↻</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },

  hero: { marginBottom: spacing.xxl },
  heroLabel: { fontSize: font.body, color: colors.textMuted, fontWeight: font.medium, letterSpacing: 1, textTransform: "uppercase" as const },
  heroTitle: { fontSize: font.hero, fontWeight: font.heavy, color: colors.text, marginTop: spacing.xs },
  heroPills: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pill: { backgroundColor: colors.bgElevated, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
  pillAction: { backgroundColor: colors.amberSubtle },
  pillText: { fontSize: font.caption, color: colors.textSecondary, fontWeight: font.medium },

  resumeBanner: {
    backgroundColor: colors.amber,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden" as const,
    ...shadow.elevated,
  },
  resumeMain: { flex: 1, padding: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resumeTitle: { fontSize: font.bodyLarge, fontWeight: font.bold, color: "#fff" },
  resumeSubtitle: { fontSize: font.body, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  resumeArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  resumeArrowText: { fontSize: 20, color: "#fff", fontWeight: font.bold },
  resumeDismiss: { width: 44, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.1)" },
  resumeDismissText: { fontSize: 16, color: "rgba(255,255,255,0.8)", fontWeight: font.bold },

  sectionHeading: { fontSize: font.caption, fontWeight: font.semibold, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: spacing.sm },
  anchorRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl, flexWrap: "wrap" as const },
  anchorPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: "transparent",
  },
  anchorPillActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  anchorPillText: { fontSize: font.body, color: colors.textSecondary, fontWeight: font.medium },
  anchorPillTextActive: { color: colors.amber, fontWeight: font.bold },

  generateBtn: {
    backgroundColor: colors.amber,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    ...shadow.elevated,
  },
  generateBtnText: { fontSize: font.subtitle, fontWeight: font.bold, color: "#fff" },
  generateBtnSub: { fontSize: font.caption, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  secondaryRow: { flexDirection: "row", gap: spacing.md },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.bgCard,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  secondaryBtnText: { fontSize: font.bodyLarge, fontWeight: font.semibold, color: colors.text },
  secondaryBtnSub: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },

  dayCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  dayLabel: { fontSize: font.title, fontWeight: font.bold, color: colors.text },
  headerAction: { fontSize: font.body, color: colors.amber, fontWeight: font.semibold },

  staleBanner: { backgroundColor: colors.redSubtle, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  staleText: { fontSize: font.body, color: colors.red },

  inboxNotice: { backgroundColor: colors.greenSubtle, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  inboxNoticeText: { fontSize: font.body, color: colors.green, fontWeight: font.medium },

  liftSection: { marginTop: spacing.sm },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  sectionLabel: { fontSize: font.caption, fontWeight: font.semibold, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: spacing.sm },

  exerciseRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md, gap: spacing.md },
  exerciseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted, marginTop: 7 },
  exerciseInfo: { flex: 1 },
  auxNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" as const },
  exerciseName: { fontSize: font.bodyLarge, fontWeight: font.semibold, color: colors.text },
  auxCatTag: { fontSize: 10, fontWeight: font.medium, letterSpacing: 0.5 },
  lockTag: { fontSize: 10, color: colors.amber, fontWeight: font.semibold, letterSpacing: 0.5 },
  ssTag: { fontSize: 10, color: colors.textMuted, fontWeight: font.semibold, letterSpacing: 0.5 },
  exerciseRx: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
  lastLine: { fontSize: font.caption, color: colors.textMuted, marginTop: 2, fontStyle: "italic" as const },
  rerollBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  rerollBtnText: { fontSize: 16, color: colors.amber, fontWeight: font.bold },

  startBtn: {
    backgroundColor: colors.amber,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadow.card,
  },
  startBtnText: { fontSize: font.subtitle, fontWeight: font.bold, color: "#fff" },
});
