import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useStore } from "../../lib/store";

export default function ProgramScreen() {
  const { program, currentWeek, trainingMaxes, setCurrentWeek } = useStore();
  const weeks = program.weekSchedule;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Program Overview</Text>
      <Text style={styles.subtitle}>
        21-Week SBS Hypertrophy — Week {currentWeek}
      </Text>

      {/* TM Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Training Maxes</Text>
        {[...program.config.mainLifts, ...program.config.auxiliaries].map(
          (lift) => (
            <View key={lift.name} style={styles.tmRow}>
              <Text style={styles.tmName}>{lift.name}</Text>
              <Text style={styles.tmValue}>
                {(trainingMaxes[lift.name] ?? lift.trainingMax).toFixed(1)}
              </Text>
            </View>
          )
        )}
      </View>

      {/* Week grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weeks</Text>
        <View style={styles.weekGrid}>
          {weeks.map((w) => {
            const isCurrent = w.weekNumber === currentWeek;
            const isPast = w.weekNumber < currentWeek;
            return (
              <TouchableOpacity
                key={w.weekNumber}
                style={[
                  styles.weekCell,
                  isCurrent && styles.weekCellCurrent,
                  isPast && styles.weekCellPast,
                ]}
                onPress={() => setCurrentWeek(w.weekNumber)}
              >
                <Text
                  style={[
                    styles.weekCellText,
                    isCurrent && styles.weekCellTextCurrent,
                  ]}
                >
                  {w.weekNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Current week detail */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Week {currentWeek} Detail</Text>
        {Object.entries(
          weeks.find((w) => w.weekNumber === currentWeek)?.exerciseConfigs ?? {}
        ).map(([name, config]) => (
          <View key={name} style={styles.weekDetailRow}>
            <Text style={styles.weekDetailName}>{name}</Text>
            <Text style={styles.weekDetailInfo}>
              {(config.intensity * 100).toFixed(1)}% — {config.reps} reps ×{" "}
              {config.sets} sets (rep out {config.repOutTarget})
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", padding: 16 },
  title: { fontSize: 28, fontWeight: "bold", color: "#e0e0e0" },
  subtitle: { fontSize: 16, color: "#888", marginTop: 4, marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4fc3f7",
    marginBottom: 10,
  },
  tmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tmName: { fontSize: 16, color: "#e0e0e0" },
  tmValue: { fontSize: 16, color: "#4fc3f7", fontWeight: "bold" },
  weekGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weekCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  weekCellCurrent: { backgroundColor: "#4fc3f7" },
  weekCellPast: { backgroundColor: "#2a2a4e" },
  weekCellText: { color: "#888", fontSize: 16, fontWeight: "bold" },
  weekCellTextCurrent: { color: "#0f0f23" },
  weekDetailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  weekDetailName: { fontSize: 16, color: "#e0e0e0", fontWeight: "600" },
  weekDetailInfo: { fontSize: 14, color: "#aaa", marginTop: 2 },
});
