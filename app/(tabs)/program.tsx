import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import { useStore } from "../../lib/store";
import { colors, spacing, radius, font } from "../../lib/theme";

// Category display info
const categoryInfo: Record<string, { label: string; color: string }> = {
  squat: { label: "Squat", color: "#E8915A" },
  bench: { label: "Bench", color: "#F5A623" },
  deadlift: { label: "Deadlift", color: "#D4891A" },
  ohp: { label: "OHP", color: "#C4B05A" },
};

export default function ProgramTab() {
  const { program, currentWeek, trainingMaxes, days, exerciseGroups, updateTrainingMax, moveExercise } = useStore();
  const weeks = program.weekSchedule;
  const [editingTM, setEditingTM] = useState<string | null>(null);
  const [tmInput, setTmInput] = useState("");
  const [activeSection, setActiveSection] = useState<"groups" | "days" | "schedule">("groups");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Program</Text>
      <Text style={styles.subtitle}>SBS Hypertrophy · Week {currentWeek} of 21</Text>

      {/* Section tabs */}
      <View style={styles.sectionTabs}>
        {(["groups", "days", "schedule"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sectionTab, activeSection === s && styles.sectionTabActive]}
            onPress={() => setActiveSection(s)}
          >
            <Text style={[styles.sectionTabText, activeSection === s && styles.sectionTabTextActive]}>
              {s === "groups" ? "Exercise Groups" : s === "days" ? "Day Layout" : "Week Schedule"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exercise Groups */}
      {activeSection === "groups" && (
        <View style={styles.section}>
          {exerciseGroups.map((group) => {
            const info = categoryInfo[group.category] || { label: group.label, color: colors.amber };
            return (
              <View key={group.category} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupDot, { backgroundColor: info.color }]} />
                  <Text style={styles.groupLabel}>{info.label}</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: info.color + "20" }]}>
                    <Text style={[styles.categoryBadgeText, { color: info.color }]}>
                      {group.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Main lift */}
                <TouchableOpacity
                  style={styles.liftRow}
                  onPress={() => { setEditingTM(group.main.name); setTmInput(group.main.trainingMax.toFixed(1)); }}
                >
                  <View style={styles.liftInfo}>
                    <View style={styles.liftBadgeRow}>
                      <View style={[styles.liftBadgeDot, { backgroundColor: info.color }]} />
                      <Text style={[styles.liftBadge, { color: info.color }]}>MAIN</Text>
                    </View>
                    <Text style={styles.liftName}>{group.main.name}</Text>
                  </View>
                  {editingTM === group.main.name ? (
                    <TextInput
                      style={styles.tmInput}
                      value={tmInput}
                      onChangeText={setTmInput}
                      onBlur={() => { const n = parseFloat(tmInput); if (!isNaN(n) && n > 0) updateTrainingMax(group.main.name, n); setEditingTM(null); }}
                      keyboardType="numeric"
                      autoFocus
                    />
                  ) : (
                    <View style={styles.tmDisplay}>
                      <Text style={[styles.tmValue, { color: info.color }]}>{group.main.trainingMax.toFixed(0)}</Text>
                      <Text style={styles.tmUnit}>lbs</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Auxiliaries */}
                {group.auxiliaries.map((aux) => (
                  <TouchableOpacity
                    key={aux.name}
                    style={styles.liftRow}
                    onPress={() => { setEditingTM(aux.name); setTmInput(aux.trainingMax.toFixed(1)); }}
                  >
                    <View style={styles.liftInfo}>
                      <View style={styles.liftBadgeRow}>
                        <View style={[styles.liftBadgeDot, { backgroundColor: colors.textMuted }]} />
                        <Text style={styles.liftBadgeAux}>AUX</Text>
                      </View>
                      <Text style={styles.liftNameAux}>{aux.name}</Text>
                    </View>
                    {editingTM === aux.name ? (
                      <TextInput
                        style={styles.tmInput}
                        value={tmInput}
                        onChangeText={setTmInput}
                        onBlur={() => { const n = parseFloat(tmInput); if (!isNaN(n) && n > 0) updateTrainingMax(aux.name, n); setEditingTM(null); }}
                        keyboardType="numeric"
                        autoFocus
                      />
                    ) : (
                      <View style={styles.tmDisplay}>
                        <Text style={styles.tmValueAux}>{aux.trainingMax.toFixed(0)}</Text>
                        <Text style={styles.tmUnit}>lbs</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* Day Layout */}
      {activeSection === "days" && (
        <View style={styles.section}>
          <Text style={styles.moveHint}>Long-press an exercise to move it to another day</Text>
          {days.map((day) => {
            const mains = day.exercises.filter((e) => e.category === "main");
            const pulls = day.exercises.filter((e) => e.category === "pull");
            const accs = day.exercises.filter((e) => e.category === "accessory");

            const handleMoveExercise = (exerciseId: string, exerciseName: string) => {
              const otherDays = days.filter((d) => d.dayIndex !== day.dayIndex);
              Alert.alert(
                `Move ${exerciseName}`,
                `Move from ${day.label} to:`,
                [
                  ...otherDays.map((d) => ({
                    text: d.label,
                    onPress: () => moveExercise(day.dayIndex, exerciseId, d.dayIndex),
                  })),
                  { text: "Cancel", style: "cancel" as const },
                ]
              );
            };

            return (
              <View key={day.dayIndex} style={styles.dayCard}>
                <Text style={styles.dayLabel}>{day.label}</Text>

                <Text style={styles.daySectionLabel}>Main / Auxiliary Lifts</Text>
                {mains.map((ex) => (
                  <TouchableOpacity key={ex.id} style={styles.dayExRow} onLongPress={() => handleMoveExercise(ex.id, ex.name)}>
                    <View style={styles.exerciseDot} />
                    <Text style={styles.dayExName}>{ex.name}</Text>
                    <Text style={styles.dayExTM}>TM {(trainingMaxes[ex.name] ?? ex.trainingMax).toFixed(0)}</Text>
                  </TouchableOpacity>
                ))}

                {pulls.length > 0 && (
                  <>
                    <Text style={[styles.daySectionLabel, styles.pullSectionLabel]}>Pull</Text>
                    {pulls.map((ex) => (
                      <TouchableOpacity key={ex.id} style={styles.dayExRow} onLongPress={() => handleMoveExercise(ex.id, ex.name)}>
                        <View style={styles.pullDot} />
                        <Text style={styles.dayExName}>{ex.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {accs.length > 0 && (
                  <>
                    <Text style={[styles.daySectionLabel, { marginTop: spacing.md }]}>Accessories</Text>
                    {accs.map((ex) => (
                      <TouchableOpacity key={ex.id} style={styles.dayExRow} onLongPress={() => handleMoveExercise(ex.id, ex.name)}>
                        <View style={[styles.exerciseDot, { backgroundColor: colors.textMuted }]} />
                        <Text style={styles.dayExNameAcc}>{ex.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Week Schedule */}
      {activeSection === "schedule" && (
        <View style={styles.section}>
          <View style={styles.weekGrid}>
            {weeks.map((w) => {
              const isCurrent = w.weekNumber === currentWeek;
              const isPast = w.weekNumber < currentWeek;
              return (
                <View key={w.weekNumber} style={[styles.weekCell, isCurrent && styles.weekCellCurrent, isPast && styles.weekCellPast]}>
                  <Text style={[styles.weekCellText, isCurrent && styles.weekCellTextCurrent]}>{w.weekNumber}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.weekDetail}>
            <Text style={styles.weekDetailTitle}>Week {currentWeek}</Text>
            {Object.entries(weeks.find((w) => w.weekNumber === currentWeek)?.exerciseConfigs ?? {}).map(([name, config]) => (
              <View key={name} style={styles.weekDetailRow}>
                <Text style={styles.weekDetailName}>{name}</Text>
                <Text style={styles.weekDetailInfo}>
                  {(config.intensity * 100).toFixed(0)}% · {config.reps} reps · {config.sets} sets
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { fontSize: font.heading, fontWeight: font.heavy, color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },

  sectionTabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xxl },
  sectionTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.pill, backgroundColor: colors.bgCard },
  sectionTabActive: { backgroundColor: colors.amber },
  sectionTabText: { fontSize: font.body, fontWeight: font.medium, color: colors.textSecondary },
  sectionTabTextActive: { color: colors.bg, fontWeight: font.semibold },

  section: {},
  moveHint: { fontSize: font.caption, color: colors.textDim, fontStyle: "italic", marginBottom: spacing.lg },

  // Exercise Groups
  groupCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupLabel: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.text, flex: 1 },
  categoryBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: 2, borderRadius: radius.pill },
  categoryBadgeText: { fontSize: 10, fontWeight: font.bold, letterSpacing: 1 },

  liftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  liftInfo: {},
  liftBadgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 2 },
  liftBadgeDot: { width: 5, height: 5, borderRadius: 3 },
  liftBadge: { fontSize: 10, fontWeight: font.bold, letterSpacing: 1 },
  liftBadgeAux: { fontSize: 10, fontWeight: font.bold, color: colors.textMuted, letterSpacing: 1 },
  liftName: { fontSize: font.bodyLarge, fontWeight: font.semibold, color: colors.text },
  liftNameAux: { fontSize: font.bodyLarge, color: colors.textSecondary },

  tmDisplay: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  tmValue: { fontSize: font.title, fontWeight: font.bold },
  tmValueAux: { fontSize: font.subtitle, fontWeight: font.semibold, color: colors.textSecondary },
  tmUnit: { fontSize: font.caption, color: colors.textMuted },
  tmInput: { backgroundColor: colors.bgElevated, color: colors.text, fontSize: font.subtitle, fontWeight: font.bold, textAlign: "center", width: 80, height: 40, borderRadius: radius.sm },

  // Day Layout
  dayCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayLabel: { fontSize: font.title, fontWeight: font.bold, color: colors.text, marginBottom: spacing.lg },
  daySectionLabel: { fontSize: font.caption, fontWeight: font.medium, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: spacing.sm },
  pullSectionLabel: { marginTop: spacing.md, color: colors.pull },
  dayExRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs + 2 },
  exerciseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber },
  pullDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.pull },
  dayExName: { fontSize: font.bodyLarge, color: colors.text, fontWeight: font.medium, flex: 1 },
  dayExNameAcc: { fontSize: font.body, color: colors.textSecondary, flex: 1 },
  dayExTM: { fontSize: font.body, color: colors.textMuted },

  // Week Schedule
  weekGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xxl },
  weekCell: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  weekCellCurrent: { backgroundColor: colors.amber, borderColor: colors.amber },
  weekCellPast: { backgroundColor: colors.bgElevated },
  weekCellText: { color: colors.textMuted, fontSize: font.bodyLarge, fontWeight: font.bold },
  weekCellTextCurrent: { color: colors.bg },

  weekDetail: {},
  weekDetailTitle: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.text, marginBottom: spacing.md },
  weekDetailRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  weekDetailName: { fontSize: font.bodyLarge, color: colors.text, fontWeight: font.medium },
  weekDetailInfo: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
});
