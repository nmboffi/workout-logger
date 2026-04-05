import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "../lib/store";

export default function SwapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dayIndex: string;
    exerciseId: string;
    currentName: string;
    category: string;
  }>();

  const { program, swapExercise } = useStore();
  const dayIndex = parseInt(params.dayIndex ?? "0", 10);

  // Build list of available exercises to swap to
  const allExercises: string[] = [];

  if (params.category === "main") {
    for (const lift of program.config.mainLifts) {
      allExercises.push(lift.name);
    }
    for (const lift of program.config.auxiliaries) {
      allExercises.push(lift.name);
    }
  } else {
    // Accessory — show all pools
    for (const [_pool, exercises] of Object.entries(
      program.config.accessoryPools
    )) {
      for (const name of exercises) {
        if (!allExercises.includes(name)) {
          allExercises.push(name);
        }
      }
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Replace {params.currentName}</Text>
      <Text style={styles.subtitle}>Tap an exercise to swap</Text>

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
          >
            <Text
              style={[
                styles.optionText,
                isCurrent && styles.optionTextCurrent,
              ]}
            >
              {name}
            </Text>
            {isCurrent && <Text style={styles.currentLabel}>current</Text>}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#e0e0e0" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 4, marginBottom: 16 },
  option: {
    backgroundColor: "#1a1a2e",
    padding: 14,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionCurrent: { borderWidth: 1, borderColor: "#4fc3f7" },
  optionText: { fontSize: 16, color: "#e0e0e0" },
  optionTextCurrent: { color: "#4fc3f7" },
  currentLabel: { fontSize: 12, color: "#4fc3f7" },
});
