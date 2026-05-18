import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { useStore } from "../../lib/store";
import { exportAllData } from "../../lib/storage";
import type { ScheduleType } from "../../lib/types";
import { colors, spacing, radius, font } from "../../lib/theme";

export default function SettingsTab() {
  const {
    scheduleType,
    setScheduleType,
    currentWeek,
    setCurrentWeek,
    programVersions,
    saveVersion,
    loadVersion,
    deleteVersion,
    resetDays,
  } = useStore();

  const [versionName, setVersionName] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);

  const scheduleOptions: ScheduleType[] = ["(3+1)x", "4x", "rehab"];

  const handleSaveVersion = () => {
    const name = versionName.trim() || `Snapshot ${new Date().toLocaleDateString()}`;
    saveVersion(name);
    setVersionName("");
    setShowNewVersion(false);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    Alert.alert("Exported", `${data.length} chars. Check console for JSON data.`);
    console.log("EXPORT:", data);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Schedule */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Schedule</Text>
        <View style={styles.toggleRow}>
          {scheduleOptions.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.toggle, scheduleType === opt && styles.toggleActive]}
              onPress={() => setScheduleType(opt)}
            >
              <Text style={[styles.toggleText, scheduleType === opt && styles.toggleTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Week */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Week</Text>
        <View style={styles.weekControl}>
          <TouchableOpacity
            style={styles.weekBtn}
            onPress={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
          >
            <Text style={styles.weekBtnText}>-</Text>
          </TouchableOpacity>
          <View style={styles.weekDisplay}>
            <Text style={styles.weekNum}>{currentWeek}</Text>
            <Text style={styles.weekTotal}>/ 21</Text>
          </View>
          <TouchableOpacity
            style={styles.weekBtn}
            onPress={() => setCurrentWeek(Math.min(21, currentWeek + 1))}
          >
            <Text style={styles.weekBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Versions */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Program Versions</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowNewVersion(!showNewVersion)}
          >
            <Text style={styles.addBtnText}>{showNewVersion ? "Cancel" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        {showNewVersion && (
          <View style={styles.newVersionRow}>
            <TextInput
              style={styles.versionInput}
              value={versionName}
              onChangeText={setVersionName}
              placeholder="Version name (optional)"
              placeholderTextColor={colors.textDim}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVersion}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}

        {programVersions.length === 0 && !showNewVersion && (
          <Text style={styles.emptyText}>
            No saved versions. Save a snapshot to preserve your current exercise selections and training maxes.
          </Text>
        )}

        {programVersions.map((v) => (
          <View key={v.id} style={styles.versionRow}>
            <View style={styles.versionInfo}>
              <Text style={styles.versionName}>{v.name}</Text>
              <Text style={styles.versionDate}>
                {v.date} · {v.scheduleType} · Week {v.currentWeek}
              </Text>
            </View>
            <View style={styles.versionActions}>
              <TouchableOpacity
                style={styles.versionBtn}
                onPress={() => {
                  Alert.alert("Load Version", `Restore "${v.name}"?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Load", onPress: () => loadVersion(v.id) },
                  ]);
                }}
              >
                <Text style={styles.versionBtnText}>Load</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Delete", `Delete "${v.name}"?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteVersion(v.id) },
                  ]);
                }}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Data */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>Export All Data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { marginTop: spacing.sm }]}
          onPress={() => {
            Alert.alert(
              "Reset Day Layout",
              "This will restore the default exercise assignments for each day from the original spreadsheet. Your training maxes and workout history will not be affected.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => resetDays() },
              ]
            );
          }}
        >
          <Text style={[styles.actionBtnText, { color: colors.red }]}>Reset Day Layout to Default</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { fontSize: font.heading, fontWeight: font.heavy, color: colors.text, marginBottom: spacing.xxl },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.text, marginBottom: spacing.lg },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },

  // Schedule toggle
  toggleRow: { flexDirection: "row", gap: spacing.md },
  toggle: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
  },
  toggleActive: { backgroundColor: colors.amber },
  toggleText: { fontSize: font.bodyLarge, fontWeight: font.semibold, color: colors.textMuted },
  toggleTextActive: { color: colors.bg },

  // Week
  weekControl: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xxl },
  weekBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  weekBtnText: { fontSize: font.title, fontWeight: font.bold, color: colors.amber },
  weekDisplay: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  weekNum: { fontSize: font.hero, fontWeight: font.heavy, color: colors.text },
  weekTotal: { fontSize: font.subtitle, color: colors.textMuted },

  // Versions
  addBtn: { backgroundColor: colors.amberSubtle, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  addBtnText: { fontSize: font.body, fontWeight: font.semibold, color: colors.amber },
  newVersionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  versionInput: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: font.body,
  },
  saveBtn: { backgroundColor: colors.amber, paddingHorizontal: spacing.xl, borderRadius: radius.md, justifyContent: "center" },
  saveBtnText: { fontSize: font.body, fontWeight: font.bold, color: colors.bg },
  emptyText: { fontSize: font.body, color: colors.textMuted, lineHeight: 20 },

  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  versionInfo: { flex: 1 },
  versionName: { fontSize: font.bodyLarge, fontWeight: font.medium, color: colors.text },
  versionDate: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },
  versionActions: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  versionBtn: { backgroundColor: colors.amberSubtle, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  versionBtnText: { fontSize: font.caption, fontWeight: font.semibold, color: colors.amber },
  deleteText: { fontSize: font.caption, color: colors.textDim },

  // Data
  actionBtn: {
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
  },
  actionBtnText: { fontSize: font.bodyLarge, color: colors.textSecondary, fontWeight: font.medium },
});
