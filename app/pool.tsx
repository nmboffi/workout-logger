import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useStore } from "../lib/store";
import { colors, spacing, radius, font } from "../lib/theme";
import type { PoolExercise } from "../lib/types";

const PATTERN_LABELS: Record<string, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
  ohp: "Overhead Press",
};

// Quick pool pruning at the gym: tap a lift to remove it from the generator's
// candidates (it keeps its history and TM); tap again to restore. Then
// regenerate or reroll from the home screen.
export default function PoolScreen() {
  const { exercisePool, excludedExercises, toggleExcludedExercise } = useStore();
  const excluded = new Set(excludedExercises);

  const tmLifts = exercisePool.exercises.filter(
    (e) => e.roles.includes("main") || e.roles.includes("aux")
  );
  const others = exercisePool.exercises.filter(
    (e) => !e.roles.includes("main") && !e.roles.includes("aux")
  );

  const sections: { title: string; exercises: PoolExercise[] }[] = [];
  for (const pattern of ["squat", "bench", "deadlift", "ohp"]) {
    const group = tmLifts.filter((e) => e.pattern === pattern);
    if (group.length > 0) {
      sections.push({ title: `${PATTERN_LABELS[pattern]} (main/aux)`, exercises: group });
    }
  }
  const byPool = new Map<string, PoolExercise[]>();
  for (const e of others) {
    const key = e.accessoryPool ?? "Other";
    const group = byPool.get(key) ?? [];
    group.push(e);
    byPool.set(key, group);
  }
  for (const [title, exercises] of byPool) {
    sections.push({ title, exercises });
  }

  const excludedCount = excludedExercises.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Exercise Pool</Text>
      <Text style={styles.subtitle}>
        Tap a lift to remove it from the generator (history and training maxes are kept).
        {excludedCount > 0 ? `  ${excludedCount} removed.` : ""}
      </Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.exercises.map((ex) => {
            const isOut = excluded.has(ex.id);
            return (
              <TouchableOpacity
                key={ex.id}
                style={styles.row}
                onPress={() => toggleExcludedExercise(ex.id)}
                activeOpacity={0.6}
              >
                <Text style={[styles.rowName, isOut && styles.rowNameOut]}>
                  {ex.name}
                </Text>
                <View style={[styles.badge, isOut ? styles.badgeOut : styles.badgeIn]}>
                  <Text style={[styles.badgeText, isOut ? styles.badgeTextOut : styles.badgeTextIn]}>
                    {isOut ? "Removed" : "In pool"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { fontSize: font.heading, fontWeight: font.heavy, color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl, lineHeight: 20 },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: font.caption, fontWeight: font.semibold, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowName: { fontSize: font.bodyLarge, color: colors.text, fontWeight: font.medium, flex: 1, marginRight: spacing.md },
  rowNameOut: { color: colors.textDim, textDecorationLine: "line-through" as const },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  badgeIn: { backgroundColor: colors.greenSubtle },
  badgeOut: { backgroundColor: colors.redSubtle },
  badgeText: { fontSize: font.caption, fontWeight: font.semibold },
  badgeTextIn: { color: colors.green },
  badgeTextOut: { color: colors.red },
});
