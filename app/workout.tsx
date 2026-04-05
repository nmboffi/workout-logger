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

  const handleComplete = () => {
    if (!allMainsDone) {
      Alert.alert(
        "Incomplete",
        "Log reps on last set for all main lifts before completing."
      );
      return;
    }
    completeWorkout();
    router.back();
  };

  const handleDiscard = () => {
    Alert.alert("Discard Workout?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          discardWorkout();
          router.back();
        },
      },
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{activeWorkout.dayLabel}</Text>
        <Text style={styles.subtitle}>
          Week {activeWorkout.weekNumber}
        </Text>
      </View>

      {[...groups.entries()].map(([groupKey, exercises], gi) => (
        <View key={gi}>
          {groupKey && (
            <Text style={styles.supersetLabel}>
              Superset {groupKey}
            </Text>
          )}
          {exercises.map((ex) => (
            <ExerciseCard key={ex.exerciseId} exercise={ex} />
          ))}
        </View>
      ))}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeBtnText}>Complete Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
          <Text style={styles.discardBtnText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ExerciseCard({
  exercise,
}: {
  exercise: ReturnType<typeof useStore.getState>["activeWorkout"] extends
    | { exercises: (infer E)[] }
    | null
    ? E
    : never;
}) {
  const { logRepsOnLastSet, logAccessorySet, toggleAccessoryDone, addExerciseNote } =
    useStore();
  const [repsInput, setRepsInput] = useState(
    exercise.repsOnLastSet?.toString() ?? ""
  );
  const [showNotes, setShowNotes] = useState(false);
  const [expanded, setExpanded] = useState(exercise.category === "main");

  if (exercise.category === "main") {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
          {exercise.done && <Text style={styles.doneCheck}>✓</Text>}
        </View>

        {exercise.tmSingleWeight && (
          <Text style={styles.tmSingle}>
            TM Single @8: {exercise.tmSingleWeight} lbs
          </Text>
        )}

        <View style={styles.prescription}>
          <View style={styles.prescriptionItem}>
            <Text style={styles.prescriptionLabel}>Weight</Text>
            <Text style={styles.prescriptionValue}>
              {exercise.prescribedWeight}
            </Text>
          </View>
          <View style={styles.prescriptionItem}>
            <Text style={styles.prescriptionLabel}>Reps</Text>
            <Text style={styles.prescriptionValue}>
              {exercise.prescribedReps}
            </Text>
          </View>
          <View style={styles.prescriptionItem}>
            <Text style={styles.prescriptionLabel}>Sets</Text>
            <Text style={styles.prescriptionValue}>{exercise.sets}</Text>
          </View>
          <View style={styles.prescriptionItem}>
            <Text style={styles.prescriptionLabel}>Rep Out</Text>
            <Text style={styles.prescriptionValue}>
              {exercise.repOutTarget}
            </Text>
          </View>
        </View>

        <View style={styles.lastSetRow}>
          <Text style={styles.lastSetLabel}>Reps on last set:</Text>
          <TextInput
            style={styles.repsInput}
            value={repsInput}
            onChangeText={setRepsInput}
            onBlur={() => {
              const n = parseInt(repsInput, 10);
              if (!isNaN(n) && n > 0) {
                logRepsOnLastSet(exercise.exerciseId, n);
              }
            }}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor="#666"
          />
          {exercise.repOutTarget !== null &&
            exercise.repsOnLastSet !== null && (
              <Text
                style={[
                  styles.repsDiff,
                  {
                    color:
                      exercise.repsOnLastSet >= exercise.repOutTarget
                        ? "#4caf50"
                        : "#f44336",
                  },
                ]}
              >
                {exercise.repsOnLastSet >= exercise.repOutTarget
                  ? `+${exercise.repsOnLastSet - exercise.repOutTarget}`
                  : `${exercise.repsOnLastSet - exercise.repOutTarget}`}
              </Text>
            )}
        </View>

        <TouchableOpacity onPress={() => setShowNotes(!showNotes)}>
          <Text style={styles.notesToggle}>
            {showNotes ? "Hide notes" : "Add notes"}
          </Text>
        </TouchableOpacity>
        {showNotes && (
          <TextInput
            style={styles.notesInput}
            value={exercise.notes}
            onChangeText={(text) =>
              addExerciseNote(exercise.exerciseId, text)
            }
            placeholder="Notes..."
            placeholderTextColor="#666"
            multiline
          />
        )}
      </View>
    );
  }

  // Accessory
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => toggleAccessoryDone(exercise.exerciseId)}
            hitSlop={12}
          >
            <View
              style={[
                styles.checkbox,
                exercise.done && styles.checkboxDone,
              ]}
            >
              {exercise.done && <Text style={styles.checkboxText}>✓</Text>}
            </View>
          </TouchableOpacity>
          <Text style={styles.expandArrow}>{expanded ? "▾" : "▸"}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accessorySets}>
          {exercise.accessorySets.map((s, i) => (
            <View key={i} style={styles.accessorySetRow}>
              <Text style={styles.setNumber}>Set {i + 1}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="wt"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={s.weight?.toString() ?? ""}
                onChangeText={(t) =>
                  logAccessorySet(exercise.exerciseId, i, {
                    weight: t ? parseFloat(t) : null,
                  })
                }
              />
              <Text style={styles.timesSign}>×</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="reps"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={s.reps?.toString() ?? ""}
                onChangeText={(t) =>
                  logAccessorySet(exercise.exerciseId, i, {
                    reps: t ? parseInt(t, 10) : null,
                  })
                }
              />
            </View>
          ))}
          <TouchableOpacity
            onPress={() => {
              const { activeWorkout } = useStore.getState();
              if (!activeWorkout) return;
              const ex = activeWorkout.exercises.find(
                (e) => e.exerciseId === exercise.exerciseId
              );
              if (!ex) return;
              logAccessorySet(exercise.exerciseId, ex.accessorySets.length, {
                weight: null,
                reps: null,
                done: false,
              });
            }}
          >
            <Text style={styles.addSetText}>+ Add set</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#e0e0e0" },
  subtitle: { fontSize: 16, color: "#888", marginTop: 4 },
  emptyText: { color: "#888", fontSize: 18, textAlign: "center", marginTop: 40 },
  supersetLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ff9800",
    marginTop: 12,
    marginBottom: 4,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#e0e0e0" },
  doneCheck: { fontSize: 20, color: "#4caf50" },
  tmSingle: {
    fontSize: 13,
    color: "#ff9800",
    marginTop: 6,
    fontStyle: "italic",
  },
  prescription: {
    flexDirection: "row",
    marginTop: 12,
    gap: 16,
  },
  prescriptionItem: { alignItems: "center" },
  prescriptionLabel: { fontSize: 12, color: "#888" },
  prescriptionValue: { fontSize: 20, fontWeight: "bold", color: "#4fc3f7" },
  lastSetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  lastSetLabel: { fontSize: 14, color: "#e0e0e0" },
  repsInput: {
    backgroundColor: "#2a2a4e",
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    width: 60,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  repsDiff: { fontSize: 16, fontWeight: "bold" },
  notesToggle: { color: "#4fc3f7", fontSize: 13, marginTop: 8 },
  notesInput: {
    backgroundColor: "#2a2a4e",
    color: "#e0e0e0",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    fontSize: 14,
    minHeight: 40,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: "#4caf50", borderColor: "#4caf50" },
  checkboxText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  expandArrow: { color: "#888", fontSize: 16 },
  accessorySets: { marginTop: 10 },
  accessorySetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  setNumber: { color: "#888", fontSize: 14, width: 40 },
  smallInput: {
    backgroundColor: "#2a2a4e",
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    width: 60,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#444",
  },
  timesSign: { color: "#888", fontSize: 16 },
  addSetText: { color: "#4fc3f7", fontSize: 13, marginTop: 4 },
  actions: { marginTop: 20, gap: 12, marginBottom: 40 },
  completeBtn: {
    backgroundColor: "#4caf50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  completeBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  discardBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f44336",
  },
  discardBtnText: { color: "#f44336", fontSize: 16 },
});
