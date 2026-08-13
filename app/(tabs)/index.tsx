import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../../lib/store";
import { prescribeExercise } from "../../lib/sbs";
import { colors, spacing, radius, font, shadow, EXERCISE_CATEGORIES, MAIN_LIFTS } from "../../lib/theme";
import { formatWeight } from "../../lib/format";
import RandomHome from "../../components/RandomHome";

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
    programMode,
  } = useStore();

  if (programMode === "random") {
    return <RandomHome />;
  }

  const logsThisWeek = workoutLogs.filter(
    (l) => (l.mode ?? "sbs") === "sbs" && l.weekNumber === currentWeek
  );
  const completedDays = new Set(logsThisWeek.map((l) => l.dayIndex));

  const handleStartDay = (dayIndex: number, dayLabel: string) => {
    if (activeWorkout) {
      if (Platform.OS === "web") {
        if (window.confirm(`You have an active ${activeWorkout.dayLabel} workout. Resume it?`)) {
          router.push("/workout");
        }
      } else {
        const { Alert } = require("react-native");
        Alert.alert("Workout In Progress", `Resume ${activeWorkout.dayLabel}?`, [
          { text: "Resume", onPress: () => router.push("/workout") },
          { text: "Cancel", style: "cancel" },
        ]);
      }
      return;
    }

    const doStart = () => {
      useStore.getState().startWorkout(dayIndex);
      router.push("/workout");
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Start ${dayLabel}? (Week ${currentWeek})`)) {
        doStart();
      }
    } else {
      const { Alert } = require("react-native");
      Alert.alert(`Start ${dayLabel}?`, `Week ${currentWeek}`, [
        { text: "Cancel", style: "cancel" },
        { text: "Start", onPress: doStart },
      ]);
    }
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
            onPress={() => {
              const doDiscard = () => useStore.getState().discardWorkout();
              if (Platform.OS === "web") {
                if (window.confirm("Discard this workout?")) doDiscard();
              } else {
                require("react-native").Alert.alert("Discard?", "This cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Discard", style: "destructive", onPress: doDiscard },
                ]);
              }
            }}
            hitSlop={8}
          >
            <Text style={styles.resumeDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Day cards */}
      {days.map((day) => {
        const isDone = completedDays.has(day.dayIndex);
        const mains = day.exercises.filter((ex) => ex.category === "main" && MAIN_LIFTS.has(ex.name));
        const auxes = day.exercises.filter((ex) => ex.category === "main" && !MAIN_LIFTS.has(ex.name));
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

            {/* Main lifts */}
            {mains.length > 0 && (
              <View>
                <Text style={[styles.sectionLabel, { color: colors.amber }]}>Main</Text>
                {mains.map((ex) => {
                  const rx = prescribeExercise(ex.name, trainingMaxes[ex.name] ?? ex.trainingMax, ex.singleAt8Pct, currentWeek, program.weekSchedule, program.config.rounding);
                  const cat = EXERCISE_CATEGORIES[ex.name];
                  return (
                    <View key={ex.id} style={styles.exerciseRow}>
                      <View style={[styles.exerciseDot, cat && { backgroundColor: cat.color }]} />
                      <View style={styles.exerciseInfo}>
                        <View style={styles.auxNameRow}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          {cat && <Text style={[styles.auxCatTag, { color: cat.color }]}>{cat.label}</Text>}
                        </View>
                        {rx && <Text style={styles.exerciseRx}>{formatWeight(rx.workingWeight, ex.name)}  ·  {rx.reps} reps  ·  {rx.sets} sets</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Auxiliary lifts */}
            {auxes.length > 0 && (
              <View style={styles.liftSection}>
                <View style={styles.sectionDivider} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Aux</Text>
                {auxes.map((ex) => {
                  const rx = prescribeExercise(ex.name, trainingMaxes[ex.name] ?? ex.trainingMax, ex.singleAt8Pct, currentWeek, program.weekSchedule, program.config.rounding);
                  const cat = EXERCISE_CATEGORIES[ex.name];
                  return (
                    <View key={ex.id} style={styles.exerciseRow}>
                      <View style={[styles.exerciseDot, cat && { backgroundColor: cat.color }]} />
                      <View style={styles.exerciseInfo}>
                        <View style={styles.auxNameRow}>
                          <Text style={styles.auxName}>{ex.name}</Text>
                          {cat && <Text style={[styles.auxCatTag, { color: cat.color }]}>{cat.label}</Text>}
                        </View>
                        {rx && <Text style={styles.exerciseRx}>{formatWeight(rx.workingWeight, ex.name)}  ·  {rx.reps} reps  ·  {rx.sets} sets</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

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
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Circuit</Text>
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
  pill: { backgroundColor: colors.bgElevated, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
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
  resumeMain: {
    flex: 1,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resumeTitle: { fontSize: font.bodyLarge, fontWeight: font.bold, color: "#fff" },
  resumeSubtitle: { fontSize: font.body, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  resumeArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  resumeArrowText: { fontSize: 20, color: "#fff", fontWeight: font.bold },
  resumeDismiss: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  resumeDismissText: { fontSize: 16, color: "rgba(255,255,255,0.8)", fontWeight: font.bold },

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
  auxNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  auxName: { fontSize: font.bodyLarge, fontWeight: font.medium, color: colors.text },
  auxCatTag: { fontSize: 10, fontWeight: font.medium, letterSpacing: 0.5 },
  pullName: { fontSize: font.bodyLarge, fontWeight: font.medium, color: colors.text },

  // Accessories
  sectionDivider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  accRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, gap: spacing.sm },
  accDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  accName: { fontSize: font.bodyLarge, color: colors.textSecondary },

  startPrompt: { marginTop: spacing.md, alignItems: "center" },
  startPromptText: { fontSize: font.body, color: colors.textDim, fontStyle: "italic" },
});
