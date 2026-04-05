import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../lib/store";
import { colors, spacing, radius, font, shadow } from "../lib/theme";

export default function WorkoutScreen() {
  const router = useRouter();
  const {
    activeWorkout,
    logRepsOnLastSet,
    logAccessorySet,
    toggleAccessoryDone,
    addExerciseNote,
    completeWorkout,
    discardWorkout,
  } = useStore();

  if (!activeWorkout) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active workout</Text>
      </View>
    );
  }

  const allMainsDone = activeWorkout.exercises
    .filter((ex) => ex.category === "main")
    .every((ex) => ex.repsOnLastSet !== null);

  const totalDone = activeWorkout.exercises.filter((ex) => ex.done).length;

  const handleComplete = () => {
    if (!allMainsDone) {
      Alert.alert("Incomplete", "Log reps on last set for all main lifts before completing.");
      return;
    }
    completeWorkout();
    router.back();
  };

  const handleDiscard = () => {
    Alert.alert("Discard Workout?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { discardWorkout(); router.back(); } },
    ]);
  };

  // Group by superset
  const groups: Map<string | null, typeof activeWorkout.exercises> = new Map();
  for (const ex of activeWorkout.exercises) {
    const key = ex.supersetGroup;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ex);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{activeWorkout.dayLabel}</Text>
          <Text style={styles.headerMeta}>Week {activeWorkout.weekNumber}</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            {totalDone}/{activeWorkout.exercises.length}
          </Text>
        </View>
      </View>

      {/* Exercise cards */}
      {[...groups.entries()].map(([groupKey, exercises], gi) => (
        <View key={gi}>
          {groupKey && (
            <View style={styles.supersetHeader}>
              <View style={styles.supersetLine} />
              <Text style={styles.supersetLabel}>Superset {groupKey}</Text>
              <View style={styles.supersetLine} />
            </View>
          )}
          {exercises.map((ex) => (
            <ExerciseCard key={ex.exerciseId} exercise={ex} />
          ))}
        </View>
      ))}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.completeBtn, !allMainsDone && styles.completeBtnDisabled]}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.completeBtnText}>Complete Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
          <Text style={styles.discardBtnText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ExerciseCard({ exercise }: { exercise: any }) {
  const { logRepsOnLastSet, logAccessorySet, toggleAccessoryDone, addExerciseNote } = useStore();
  const [repsInput, setRepsInput] = useState(exercise.repsOnLastSet?.toString() ?? "");
  const [showNotes, setShowNotes] = useState(false);
  const [expanded, setExpanded] = useState(exercise.category === "main");

  if (exercise.category === "main") {
    return (
      <View style={[styles.card, exercise.done && styles.cardDone]}>
        {/* Title */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
          {exercise.done && (
            <View style={styles.checkBadge}>
              <Text style={styles.checkBadgeText}>Done</Text>
            </View>
          )}
        </View>

        {/* TM Single */}
        {exercise.tmSingleWeight && (
          <View style={styles.tmSingleRow}>
            <Text style={styles.tmSingleLabel}>TM Single @8</Text>
            <Text style={styles.tmSingleValue}>{exercise.tmSingleWeight} lbs</Text>
          </View>
        )}

        {/* Prescription */}
        <View style={styles.rxGrid}>
          <RxItem label="Weight" value={`${exercise.prescribedWeight}`} unit="lbs" />
          <RxItem label="Reps" value={`${exercise.prescribedReps}`} />
          <RxItem label="Sets" value={`${exercise.sets}`} />
          <RxItem label="Rep Out" value={`${exercise.repOutTarget}`} accent />
        </View>

        {/* Last set input */}
        <View style={styles.lastSetSection}>
          <Text style={styles.lastSetLabel}>Reps on last set</Text>
          <View style={styles.lastSetRow}>
            <TextInput
              style={styles.repsInput}
              value={repsInput}
              onChangeText={setRepsInput}
              onBlur={() => {
                const n = parseInt(repsInput, 10);
                if (!isNaN(n) && n > 0) logRepsOnLastSet(exercise.exerciseId, n);
              }}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={colors.textDim}
            />
            {exercise.repOutTarget !== null && exercise.repsOnLastSet !== null && (
              <View
                style={[
                  styles.repsDiffBadge,
                  {
                    backgroundColor:
                      exercise.repsOnLastSet >= exercise.repOutTarget
                        ? colors.greenSubtle
                        : colors.redSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.repsDiffText,
                    {
                      color:
                        exercise.repsOnLastSet >= exercise.repOutTarget
                          ? colors.green
                          : colors.red,
                    },
                  ]}
                >
                  {exercise.repsOnLastSet >= exercise.repOutTarget
                    ? `+${exercise.repsOnLastSet - exercise.repOutTarget}`
                    : `${exercise.repsOnLastSet - exercise.repOutTarget}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        <TouchableOpacity onPress={() => setShowNotes(!showNotes)}>
          <Text style={styles.notesToggle}>{showNotes ? "Hide notes" : "Add notes"}</Text>
        </TouchableOpacity>
        {showNotes && (
          <TextInput
            style={styles.notesInput}
            value={exercise.notes}
            onChangeText={(text: string) => addExerciseNote(exercise.exerciseId, text)}
            placeholder="Notes..."
            placeholderTextColor={colors.textDim}
            multiline
          />
        )}
      </View>
    );
  }

  // Accessory card
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.accTitle}>{exercise.exerciseName}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <TouchableOpacity
            onPress={() => toggleAccessoryDone(exercise.exerciseId)}
            hitSlop={12}
          >
            <View style={[styles.checkbox, exercise.done && styles.checkboxDone]}>
              {exercise.done && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
          </TouchableOpacity>
          <Text style={styles.expandArrow}>{expanded ? "▾" : "▸"}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accSets}>
          {exercise.accessorySets.map((s: any, i: number) => (
            <View key={i} style={styles.accSetRow}>
              <Text style={styles.accSetNum}>{i + 1}</Text>
              <TextInput
                style={styles.accInput}
                placeholder="wt"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                value={s.weight?.toString() ?? ""}
                onChangeText={(t: string) =>
                  logAccessorySet(exercise.exerciseId, i, { weight: t ? parseFloat(t) : null })
                }
              />
              <Text style={styles.accTimes}>×</Text>
              <TextInput
                style={styles.accInput}
                placeholder="reps"
                placeholderTextColor={colors.textDim}
                keyboardType="number-pad"
                value={s.reps?.toString() ?? ""}
                onChangeText={(t: string) =>
                  logAccessorySet(exercise.exerciseId, i, { reps: t ? parseInt(t, 10) : null })
                }
              />
            </View>
          ))}
          <TouchableOpacity
            onPress={() =>
              logAccessorySet(exercise.exerciseId, exercise.accessorySets.length, {
                weight: null,
                reps: null,
                done: false,
              })
            }
          >
            <Text style={styles.addSetText}>+ Add set</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function RxItem({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <View style={styles.rxItem}>
      <Text style={styles.rxLabel}>{label}</Text>
      <View style={styles.rxValueRow}>
        <Text style={[styles.rxValue, accent && { color: colors.amber }]}>{value}</Text>
        {unit && <Text style={styles.rxUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: font.subtitle, textAlign: "center", marginTop: 60 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xxl,
  },
  headerTitle: { fontSize: font.heading, fontWeight: font.heavy, color: colors.text },
  headerMeta: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.xs },
  progressBadge: { backgroundColor: colors.amberSubtle, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  progressText: { fontSize: font.body, fontWeight: font.bold, color: colors.amber },

  supersetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.md },
  supersetLine: { flex: 1, height: 1, backgroundColor: colors.border },
  supersetLabel: { fontSize: font.caption, fontWeight: font.semibold, color: colors.amber },

  // Cards
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDone: { borderColor: colors.green, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.text },
  checkBadge: { backgroundColor: colors.greenSubtle, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  checkBadgeText: { fontSize: font.caption, fontWeight: font.semibold, color: colors.green },

  tmSingleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.amberSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  tmSingleLabel: { fontSize: font.caption, color: colors.amber, fontWeight: font.medium },
  tmSingleValue: { fontSize: font.body, color: colors.amber, fontWeight: font.bold },

  // Prescription grid
  rxGrid: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.sm },
  rxItem: { flex: 1, alignItems: "center", backgroundColor: colors.bgElevated, paddingVertical: spacing.md, borderRadius: radius.md },
  rxLabel: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  rxValueRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: spacing.xs },
  rxValue: { fontSize: font.title, fontWeight: font.bold, color: colors.text },
  rxUnit: { fontSize: font.caption, color: colors.textMuted },

  // Last set
  lastSetSection: { marginTop: spacing.xl },
  lastSetLabel: { fontSize: font.body, color: colors.textSecondary, fontWeight: font.medium, marginBottom: spacing.sm },
  lastSetRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  repsInput: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
    fontSize: font.title,
    fontWeight: font.bold,
    textAlign: "center",
    width: 72,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repsDiffBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  repsDiffText: { fontSize: font.bodyLarge, fontWeight: font.bold },

  notesToggle: { color: colors.amber, fontSize: font.body, marginTop: spacing.md, fontWeight: font.medium },
  notesInput: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    fontSize: font.body,
    minHeight: 44,
  },

  // Accessory
  accTitle: { fontSize: font.bodyLarge, fontWeight: font.semibold, color: colors.textSecondary },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.green, borderColor: colors.green },
  checkboxMark: { color: "#fff", fontSize: 14, fontWeight: font.bold },
  expandArrow: { color: colors.textMuted, fontSize: 16 },

  accSets: { marginTop: spacing.md },
  accSetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  accSetNum: { width: 20, fontSize: font.body, color: colors.textMuted, textAlign: "center" },
  accInput: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
    fontSize: font.bodyLarge,
    textAlign: "center",
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accTimes: { color: colors.textMuted, fontSize: font.body },
  addSetText: { color: colors.amber, fontSize: font.body, marginTop: spacing.xs, fontWeight: font.medium },

  // Actions
  actions: { marginTop: spacing.xxl, gap: spacing.md, marginBottom: spacing.section },
  completeBtn: {
    backgroundColor: colors.amber,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    ...shadow.card,
  },
  completeBtnDisabled: { opacity: 0.5 },
  completeBtnText: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.bg },
  discardBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  discardBtnText: { fontSize: font.bodyLarge, color: colors.textMuted },
});
