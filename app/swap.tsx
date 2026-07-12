import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "../lib/store";
import { swapCandidates } from "../lib/generator";
import { getLastPerformance, lastPerformanceLine } from "../lib/history";
import { colors, spacing, radius, font } from "../lib/theme";

export default function SwapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dayIndex: string;
    exerciseId: string;
    currentName: string;
    category: string;
    mode: string;
    slotKey: string;
  }>();

  const {
    program,
    swapExercise,
    workoutLogs,
    trainingMaxes,
    exercisePool,
    pendingGeneratedWorkout,
    setGeneratedSlotExercise,
  } = useStore();

  // Randomized mode: replace one slot of the pending generated workout with a
  // pool exercise that fits the same slot.
  if (params.mode === "random" && params.slotKey && pendingGeneratedWorkout) {
    const slot = pendingGeneratedWorkout.slots.find((s) => s.slot === params.slotKey);
    const candidates = swapCandidates(pendingGeneratedWorkout, params.slotKey, {
      logs: workoutLogs,
      pool: exercisePool,
      trainingMaxes,
      seed: 0,
      createdAt: "",
    });

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Replace</Text>
        <Text style={styles.currentName}>{slot?.exerciseName ?? params.slotKey}</Text>

        <View style={{ marginTop: spacing.xxl }}>
          {candidates.map((ex) => {
            const last = getLastPerformance(workoutLogs, ex.name);
            return (
              <TouchableOpacity
                key={ex.id}
                style={styles.option}
                onPress={() => {
                  setGeneratedSlotExercise(params.slotKey!, ex.id);
                  router.back();
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionText}>{ex.name}</Text>
                  <Text style={styles.optionMeta}>
                    {ex.accessoryPool ?? ex.pattern}
                    {last ? `  ·  Last: ${lastPerformanceLine(last)}` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {candidates.length === 0 && (
            <Text style={styles.emptyText}>No eligible exercises for this slot.</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  const dayIndex = parseInt(params.dayIndex ?? "0", 10);

  const allExercises: string[] = [];
  if (params.category === "main") {
    for (const lift of program.config.mainLifts) allExercises.push(lift.name);
    for (const lift of program.config.auxiliaries) allExercises.push(lift.name);
  } else {
    for (const [_, exercises] of Object.entries(program.config.accessoryPools)) {
      for (const name of exercises) {
        if (!allExercises.includes(name)) allExercises.push(name);
      }
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Replace</Text>
      <Text style={styles.currentName}>{params.currentName}</Text>

      <View style={{ marginTop: spacing.xxl }}>
        {allExercises.map((name) => {
          const isCurrent = name === params.currentName;
          return (
            <TouchableOpacity
              key={name}
              style={[styles.option, isCurrent && styles.optionCurrent]}
              onPress={() => {
                if (!isCurrent && params.exerciseId) {
                  swapExercise(dayIndex, params.exerciseId, name);
                }
                router.back();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, isCurrent && styles.optionTextCurrent]}>
                {name}
              </Text>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { fontSize: font.body, color: colors.textMuted, fontWeight: font.medium, textTransform: "uppercase" as const, letterSpacing: 1 },
  currentName: { fontSize: font.heading, fontWeight: font.heavy, color: colors.text, marginTop: spacing.xs },

  option: {
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCurrent: { borderColor: colors.amber },
  optionText: { fontSize: font.bodyLarge, color: colors.text },
  optionTextCurrent: { color: colors.amber, fontWeight: font.semibold },
  optionMeta: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },
  currentBadge: { backgroundColor: colors.amberSubtle, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  currentBadgeText: { fontSize: font.caption, color: colors.amber, fontWeight: font.medium },
  emptyText: { fontSize: font.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
