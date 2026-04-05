import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useStore } from "../../lib/store";

export default function HistoryScreen() {
  const { workoutLogs } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedLogs.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.emptyText}>
          No workouts logged yet. Start your first workout from the Today tab.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>
        {sortedLogs.length} workout{sortedLogs.length !== 1 ? "s" : ""} logged
      </Text>

      {sortedLogs.map((log) => {
        const isExpanded = expandedId === log.id;
        return (
          <TouchableOpacity
            key={log.id}
            style={styles.logCard}
            onPress={() => setExpandedId(isExpanded ? null : log.id)}
          >
            <View style={styles.logHeader}>
              <View>
                <Text style={styles.logDate}>{log.date}</Text>
                <Text style={styles.logLabel}>
                  Week {log.weekNumber} — {log.dayLabel}
                </Text>
              </View>
              <Text style={styles.expandArrow}>{isExpanded ? "▾" : "▸"}</Text>
            </View>

            {isExpanded && (
              <View style={styles.logDetail}>
                {log.exercises.map((ex) => (
                  <View key={ex.exerciseId} style={styles.logExercise}>
                    <View style={styles.logExRow}>
                      <Text style={styles.logExName}>{ex.exerciseName}</Text>
                      {ex.done && <Text style={styles.doneCheck}>✓</Text>}
                    </View>
                    {ex.category === "main" && (
                      <Text style={styles.logExDetail}>
                        {ex.prescribedWeight} × {ex.prescribedReps} ({ex.sets}{" "}
                        sets) — Last set: {ex.repsOnLastSet ?? "—"}/
                        {ex.repOutTarget}
                      </Text>
                    )}
                    {ex.category === "accessory" &&
                      ex.accessorySets.some((s) => s.weight || s.reps) && (
                        <Text style={styles.logExDetail}>
                          {ex.accessorySets
                            .filter((s) => s.weight || s.reps)
                            .map(
                              (s) =>
                                `${s.weight ?? "?"}×${s.reps ?? "?"}`
                            )
                            .join(", ")}
                        </Text>
                      )}
                    {ex.notes ? (
                      <Text style={styles.logExNotes}>{ex.notes}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", padding: 16 },
  title: { fontSize: 28, fontWeight: "bold", color: "#e0e0e0" },
  subtitle: { fontSize: 16, color: "#888", marginTop: 4, marginBottom: 16 },
  emptyText: { color: "#888", fontSize: 16, marginTop: 40, textAlign: "center" },
  logCard: {
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logDate: { fontSize: 16, color: "#4fc3f7", fontWeight: "bold" },
  logLabel: { fontSize: 14, color: "#aaa", marginTop: 2 },
  expandArrow: { color: "#888", fontSize: 16 },
  logDetail: { marginTop: 12 },
  logExercise: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#2a2a4e",
  },
  logExRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logExName: { fontSize: 15, color: "#e0e0e0", fontWeight: "600" },
  doneCheck: { color: "#4caf50", fontSize: 16 },
  logExDetail: { fontSize: 13, color: "#aaa", marginTop: 2 },
  logExNotes: {
    fontSize: 13,
    color: "#ff9800",
    fontStyle: "italic",
    marginTop: 2,
  },
});
