import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useStore } from "../../lib/store";
import { colors, spacing, radius, font, shadow } from "../../lib/theme";

export default function HistoryTab() {
  const { workoutLogs } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>

      {sortedLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete your first workout and it will appear here.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>
            {sortedLogs.length} workout{sortedLogs.length !== 1 ? "s" : ""} logged
          </Text>

          {sortedLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const mainCount = log.exercises.filter((e) => e.category === "main").length;
            const doneCount = log.exercises.filter((e) => e.done).length;

            return (
              <TouchableOpacity
                key={log.id}
                style={styles.logCard}
                onPress={() => setExpandedId(isExpanded ? null : log.id)}
                activeOpacity={0.7}
              >
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                    <Text style={styles.logMeta}>
                      {(log.mode ?? "sbs") === "sbs"
                        ? `Week ${log.weekNumber} · ${log.dayLabel}`
                        : log.dayLabel}
                    </Text>
                  </View>
                  <View style={styles.logHeaderRight}>
                    {log.mode === "random" && (
                      <View style={[styles.countBadge, { marginBottom: spacing.xs }]}>
                        <Text style={[styles.countBadgeText, { color: colors.amber }]}>
                          RANDOM
                        </Text>
                      </View>
                    )}
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {doneCount}/{log.exercises.length}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick preview when collapsed */}
                {!isExpanded && (
                  <View style={styles.quickPreview}>
                    {log.exercises
                      .filter((e) => e.category === "main")
                      .map((ex) => (
                        <Text key={ex.exerciseId} style={styles.previewText}>
                          {ex.exerciseName}
                          {ex.prescribedWeight ? ` ${ex.prescribedWeight}` : ""}
                          {ex.repsOnLastSet !== null
                            ? ` · ${ex.repsOnLastSet} reps`
                            : ""}
                        </Text>
                      ))}
                  </View>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <View style={styles.logDetail}>
                    {log.exercises.map((ex) => (
                      <View key={ex.exerciseId} style={styles.logExercise}>
                        <View style={styles.logExHeader}>
                          <View style={styles.logExNameRow}>
                            <View
                              style={[
                                styles.logExDot,
                                { backgroundColor: ex.done ? colors.green : colors.textDim },
                              ]}
                            />
                            <Text style={styles.logExName}>{ex.exerciseName}</Text>
                          </View>
                        </View>

                        {ex.category === "main" && (
                          <View style={styles.logExStats}>
                            <Stat label="Weight" value={`${ex.prescribedWeight}`} />
                            <Stat label="Reps" value={`${ex.prescribedReps}`} />
                            <Stat label="Sets" value={`${ex.sets}`} />
                            <Stat
                              label="Last Set"
                              value={`${ex.repsOnLastSet ?? "—"}`}
                              highlight={
                                ex.repsOnLastSet !== null && ex.repOutTarget !== null
                                  ? ex.repsOnLastSet >= ex.repOutTarget
                                  : undefined
                              }
                            />
                          </View>
                        )}

                        {(ex.category === "accessory" || ex.category === "pull") &&
                          ex.accessorySets.some((s) => s.weight || s.reps) && (
                            <Text style={styles.logExAccessory}>
                              {ex.accessorySets
                                .filter((s) => s.weight || s.reps)
                                .map((s) => `${s.weight ?? "?"}×${s.reps ?? "?"}`)
                                .join("  ·  ")}
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
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          highlight === true && { color: colors.green },
          highlight === false && { color: colors.red },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { fontSize: font.heading, fontWeight: font.heavy, color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },

  emptyState: { marginTop: 60, alignItems: "center" },
  emptyTitle: { fontSize: font.title, fontWeight: font.bold, color: colors.textSecondary },
  emptySubtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },

  logCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logHeaderLeft: {},
  logHeaderRight: {},
  logDate: { fontSize: font.bodyLarge, fontWeight: font.bold, color: colors.text },
  logMeta: { fontSize: font.body, color: colors.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: colors.bgElevated, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  countBadgeText: { fontSize: font.caption, color: colors.textSecondary, fontWeight: font.medium },

  quickPreview: { marginTop: spacing.md },
  previewText: { fontSize: font.body, color: colors.textSecondary, marginBottom: 2 },

  logDetail: { marginTop: spacing.lg },
  logExercise: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logExHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logExNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logExDot: { width: 6, height: 6, borderRadius: 3 },
  logExName: { fontSize: font.bodyLarge, color: colors.text, fontWeight: font.medium },

  logExStats: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.sm, marginLeft: spacing.lg + spacing.sm },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  statValue: { fontSize: font.bodyLarge, fontWeight: font.bold, color: colors.text, marginTop: 2 },

  logExAccessory: { fontSize: font.body, color: colors.textSecondary, marginTop: spacing.xs, marginLeft: spacing.lg + spacing.sm },
  logExNotes: { fontSize: font.body, color: colors.amberLight, fontStyle: "italic", marginTop: spacing.xs, marginLeft: spacing.lg + spacing.sm },
});
