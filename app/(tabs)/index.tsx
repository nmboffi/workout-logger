import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../../lib/store";
import { prescribeExercise } from "../../lib/sbs";
import { colors, spacing, radius, font, shadow, EXERCISE_CATEGORIES } from "../../lib/theme";

export default function WorkoutTab() {
  const router = useRouter();
  const {
    days,
    currentWeek,
    scheduleType,
    trainingMaxes,
    program,
    activeWorkout,
    workoutLogs,
  } = useStore();

  const logsThisWeek = workoutLogs.filter((l) => l.weekNumber === currentWeek);
  const completedDays = new Set(logsThisWeek.map((l) => l.dayIndex));

  const handleStartDay = (dayIndex: number, dayLabel: string) => {
    if (activeWorkout) {
      Alert.alert(
        "Workout In Progress",
        `You have an active ${activeWorkout.dayLabel} workout. Resume it or discard first.`,
        [
          { text: "Resume", onPress: () => router.push("/workout") },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    Alert.alert(
      `Start ${dayLabel}?`,
      `Week ${currentWeek} workout`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: () => {
            useStore.getState().startWorkout(dayIndex);
            router.push("/workout");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>This Week</Text>
        <Text style={styles.heroTitle}>Week {currentWeek}</Text>
        <View style={styles.heroPills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{scheduleType}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {completedDays.size}/{days.length} done
            </Text>
          </View>
        </View>
      </View>

      {/* Resume banner */}
      {activeWorkout && (
        <TouchableOpacity
          style={styles.resumeBanner}
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
      )}

      {/* Day cards */}
      {days.map((day) => {
        const isDone = completedDays.has(day.dayIndex);
        const mainExercises = day.exercises.filter((ex) => ex.category === "main");
        const pullExercises = day.exercises.filter((ex) => ex.category === "pull");
        const accessories = day.exercises.filter((ex) => ex.category === "accessory");

        return (
          <TouchableOpacity
            key={day.dayIndex}
            style={[styles.dayCard, isDone && styles.dayCardDone]}
            onPress={() => handleStartDay(day.dayIndex, day.label)}
            activeOpacity={0.7}
          >
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {isDone && (
                <View style={styles.doneBadge}>
                  <Text style={styles.doneBadgeText}>Done</Text>
                </View>
              )}
            </View>

            {/* Group main lifts by movement category */}
            {(() => {
              // Build ordered groups: preserve exercise order, group consecutive same-category
              const groups: { label: string; color: string; exercises: typeof mainExercises }[] = [];
              for (const ex of mainExercises) {
                const cat = EXERCISE_CATEGORIES[ex.name];
                const label = cat?.label ?? "LIFT";
                const color = cat?.color ?? colors.amber;
                const last = groups[groups.length - 1];
                if (last && last.label === label) {
                  last.exercises.push(ex);
                } else {
                  groups.push({ label, color, exercises: [ex] });
                }
              }
              return groups.map((group, gi) => (
                <View key={gi} style={gi > 0 ? styles.liftSection : undefined}>
                  {gi > 0 && <View style={styles.sectionDivider} />}
                  <Text style={[styles.sectionLabel, { color: group.color }]}>{group.label}</Text>
                  {group.exercises.map((ex) => {
                    const rx = prescribeExercise(
                      ex.name,
                      trainingMaxes[ex.name] ?? ex.trainingMax,
                      ex.singleAt8Pct,
                      currentWeek,
                      program.weekSchedule,
                      program.config.rounding
                    );
                    return (
                      <View key={ex.id} style={styles.exerciseRow}>
                        <View style={[styles.exerciseDot, { backgroundColor: group.color }]} />
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          {rx && (
                            <Text style={styles.exerciseRx}>
                              {rx.workingWeight} lbs  ·  {rx.reps} reps  ·  {rx.sets} sets
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ));
            })()}

            {/* Pull exercises */}
            {pullExercises.length > 0 && (
              <View style={styles.liftSection}>
                <View style={styles.sectionDivider} />
                <Text style={[styles.sectionLabel, { color: colors.pull }]}>Pull</Text>
                {pullExercises.map((ex) => (
                  <View key={ex.id} style={styles.exerciseRow}>
                    <View style={[styles.exerciseDot, { backgroundColor: colors.pull }]} />
                    <Text style={styles.pullName}>{ex.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Accessories */}
            {accessories.length > 0 && (
              <View style={styles.liftSection}>
                <View style={styles.sectionDivider} />
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Accessories</Text>
                {accessories.map((ex) => (
                  <View key={ex.id} style={styles.accRow}>
                    <View style={styles.accDot} />
                    <Text style={styles.accName}>{ex.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {!isDone && (
              <View style={styles.startPrompt}>
                <Text style={styles.startPromptText}>Tap to start</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },

  hero: { marginBottom: spacing.xxl },
  heroLabel: { fontSize: font.body, color: colors.textMuted, fontWeight: font.medium, letterSpacing: 1, textTransform: "uppercase" as const },
  heroTitle: { fontSize: font.hero, fontWeight: font.heavy, color: colors.text, marginTop: spacing.xs },
  heroPills: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pill: { backgroundColor: colors.bgCard, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
  pillText: { fontSize: font.caption, color: colors.textSecondary, fontWeight: font.medium },

  resumeBanner: {
    backgroundColor: colors.amber,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadow.elevated,
  },
  resumeTitle: { fontSize: font.bodyLarge, fontWeight: font.bold, color: colors.bg },
  resumeSubtitle: { fontSize: font.body, color: "rgba(42,33,24,0.7)", marginTop: 2 },
  resumeArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(42,33,24,0.15)", alignItems: "center", justifyContent: "center" },
  resumeArrowText: { fontSize: 20, color: colors.bg, fontWeight: font.bold },

  dayCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  dayCardDone: { opacity: 0.55 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  dayLabel: { fontSize: font.title, fontWeight: font.bold, color: colors.text },
  doneBadge: { backgroundColor: colors.greenSubtle, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  doneBadgeText: { fontSize: font.caption, fontWeight: font.semibold, color: colors.green },

  exerciseRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md, gap: spacing.md },
  exerciseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber, marginTop: 7 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: font.bodyLarge, fontWeight: font.semibold, color: colors.text },
  exerciseRx: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },

  // Lift sections (squat/bench/dead/ohp/pull)
  liftSection: { marginTop: spacing.sm },
  sectionLabel: { fontSize: font.caption, fontWeight: font.semibold, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: spacing.sm },
  pullName: { fontSize: font.bodyLarge, fontWeight: font.medium, color: colors.text },

  // Accessories
  sectionDivider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  accRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs + 2, gap: spacing.sm },
  accDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted },
  accName: { fontSize: font.body, color: colors.textSecondary },

  startPrompt: { marginTop: spacing.md, alignItems: "center" },
  startPromptText: { fontSize: font.body, color: colors.textDim, fontStyle: "italic" },
});
