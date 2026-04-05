import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../../lib/store";
import { prescribeExercise } from "../../lib/sbs";

export default function TodayScreen() {
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

  // Figure out which day to show next
  const logsThisWeek = workoutLogs.filter((l) => l.weekNumber === currentWeek);
  const completedDays = new Set(logsThisWeek.map((l) => l.dayIndex));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Week {currentWeek} of 21</Text>
        <Text style={styles.subtitle}>
          {scheduleType} schedule
        </Text>
      </View>

      {activeWorkout && (
        <TouchableOpacity
          style={styles.resumeCard}
          onPress={() => router.push("/workout")}
        >
          <Text style={styles.resumeTitle}>Resume Workout</Text>
          <Text style={styles.resumeSubtitle}>
            {activeWorkout.dayLabel} — started{" "}
            {new Date(activeWorkout.startedAt).toLocaleTimeString()}
          </Text>
        </TouchableOpacity>
      )}

      {days.map((day) => {
        const isDone = completedDays.has(day.dayIndex);
        const mainExercises = day.exercises.filter(
          (ex) => ex.category === "main"
        );
        const accessoryCount = day.exercises.filter(
          (ex) => ex.category === "accessory"
        ).length;

        return (
          <TouchableOpacity
            key={day.dayIndex}
            style={[styles.dayCard, isDone && styles.dayCardDone]}
            onPress={() => {
              if (!activeWorkout) {
                useStore.getState().startWorkout(day.dayIndex);
                router.push("/workout");
              }
            }}
            disabled={!!activeWorkout}
          >
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {isDone && <Text style={styles.checkmark}>✓</Text>}
            </View>

            {mainExercises.map((ex) => {
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
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  {rx && (
                    <Text style={styles.exerciseDetail}>
                      {rx.workingWeight} × {rx.reps} ({rx.sets} sets, rep out{" "}
                      {rx.repOutTarget})
                    </Text>
                  )}
                </View>
              );
            })}

            {accessoryCount > 0 && (
              <Text style={styles.accessoryNote}>
                + {accessoryCount} accessories
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#e0e0e0" },
  subtitle: { fontSize: 16, color: "#888", marginTop: 4 },
  resumeCard: {
    backgroundColor: "#1b5e20",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resumeTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  resumeSubtitle: { fontSize: 14, color: "#a5d6a7", marginTop: 4 },
  dayCard: {
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dayCardDone: { opacity: 0.6 },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayLabel: { fontSize: 20, fontWeight: "bold", color: "#4fc3f7" },
  checkmark: { fontSize: 20, color: "#4caf50" },
  exerciseRow: { marginVertical: 4 },
  exerciseName: { fontSize: 16, color: "#e0e0e0", fontWeight: "600" },
  exerciseDetail: { fontSize: 14, color: "#aaa", marginTop: 2 },
  accessoryNote: { fontSize: 14, color: "#666", marginTop: 8, fontStyle: "italic" },
});
