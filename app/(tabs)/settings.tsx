import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { useState } from "react";
import { useStore } from "../../lib/store";
import { exportAllData, importAllData } from "../../lib/storage";
import type { ScheduleType } from "../../lib/types";

export default function SettingsScreen() {
  const {
    scheduleType,
    setScheduleType,
    currentWeek,
    setCurrentWeek,
    trainingMaxes,
    updateTrainingMax,
    program,
  } = useStore();

  const [editingTM, setEditingTM] = useState<string | null>(null);
  const [tmInput, setTmInput] = useState("");

  const handleExport = async () => {
    const data = await exportAllData();
    Alert.alert(
      "Export",
      `Data exported (${data.length} chars). Copy from console or use share sheet.`
    );
    console.log("EXPORT:", data);
  };

  const handleImport = () => {
    Alert.alert("Import", "Paste JSON data in the console to import.");
  };

  const scheduleOptions: ScheduleType[] = ["(3+1)x", "4x"];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Schedule type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.scheduleRow}>
          {scheduleOptions.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.scheduleBtn,
                scheduleType === opt && styles.scheduleBtnActive,
              ]}
              onPress={() => setScheduleType(opt)}
            >
              <Text
                style={[
                  styles.scheduleBtnText,
                  scheduleType === opt && styles.scheduleBtnTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current week */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Week: {currentWeek}</Text>
        <View style={styles.weekRow}>
          <TouchableOpacity
            style={styles.weekBtn}
            onPress={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
          >
            <Text style={styles.weekBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.weekNum}>{currentWeek}</Text>
          <TouchableOpacity
            style={styles.weekBtn}
            onPress={() => setCurrentWeek(Math.min(21, currentWeek + 1))}
          >
            <Text style={styles.weekBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Training Maxes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training Maxes</Text>
        {[...program.config.mainLifts, ...program.config.auxiliaries].map(
          (lift) => {
            const tm = trainingMaxes[lift.name] ?? lift.trainingMax;
            const isEditing = editingTM === lift.name;
            return (
              <TouchableOpacity
                key={lift.name}
                style={styles.tmRow}
                onPress={() => {
                  setEditingTM(lift.name);
                  setTmInput(tm.toFixed(1));
                }}
              >
                <Text style={styles.tmName}>{lift.name}</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.tmInput}
                    value={tmInput}
                    onChangeText={setTmInput}
                    onBlur={() => {
                      const n = parseFloat(tmInput);
                      if (!isNaN(n) && n > 0) {
                        updateTrainingMax(lift.name, n);
                      }
                      setEditingTM(null);
                    }}
                    keyboardType="numeric"
                    autoFocus
                  />
                ) : (
                  <Text style={styles.tmValue}>{tm.toFixed(1)}</Text>
                )}
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.dataBtn} onPress={handleExport}>
          <Text style={styles.dataBtnText}>Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dataBtn} onPress={handleImport}>
          <Text style={styles.dataBtnText}>Import Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", padding: 16 },
  title: { fontSize: 28, fontWeight: "bold", color: "#e0e0e0", marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4fc3f7",
    marginBottom: 10,
  },
  scheduleRow: { flexDirection: "row", gap: 12 },
  scheduleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333",
  },
  scheduleBtnActive: { backgroundColor: "#4fc3f7", borderColor: "#4fc3f7" },
  scheduleBtnText: { color: "#888", fontSize: 16, fontWeight: "bold" },
  scheduleBtnTextActive: { color: "#0f0f23" },
  weekRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  weekBtnText: { color: "#4fc3f7", fontSize: 24, fontWeight: "bold" },
  weekNum: { color: "#e0e0e0", fontSize: 24, fontWeight: "bold" },
  tmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tmName: { fontSize: 16, color: "#e0e0e0" },
  tmValue: { fontSize: 16, color: "#4fc3f7", fontWeight: "bold" },
  tmInput: {
    backgroundColor: "#2a2a4e",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    width: 80,
    height: 36,
    borderRadius: 6,
  },
  dataBtn: {
    backgroundColor: "#1a1a2e",
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  dataBtnText: { color: "#4fc3f7", fontSize: 16 },
});
