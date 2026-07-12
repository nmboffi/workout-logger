import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore, type ImportResult } from "../lib/store";
import { parseImportText, decodeImportFragment, type ParsedImport } from "../lib/import";
import { importAllData } from "../lib/storage";
import { colors, spacing, radius, font } from "../lib/theme";

export default function ImportScreen() {
  const router = useRouter();
  const { program, exercisePool, importWorkouts, initialize } = useStore();

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [finished, setFinished] = useState<ImportResult | null>(null);

  const knownNames = new Set<string>([
    ...exercisePool.exercises.map((e) => e.name),
    ...program.config.mainLifts.map((l) => l.name),
    ...program.config.auxiliaries.map((l) => l.name),
    ...Object.values(program.config.accessoryPools).flat(),
  ]);

  const runPreview = (input: string) => {
    setFinished(null);
    const p = parseImportText(input, knownNames);
    setParsed(p);
    setPreview(p.type === "workouts" ? importWorkouts(p.payload, true) : null);
  };

  // Prefill from an #import=<base64url> link (Claude produces these). The
  // fragment arrives either directly in the URL or stashed in sessionStorage
  // by the tabs layout (router.push drops URL fragments). Clear both so
  // refreshes don't re-trigger.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hash = window.location.hash;
    let fragment: string | null = null;
    if (hash.startsWith("#import=")) {
      fragment = hash.slice("#import=".length);
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      fragment = sessionStorage.getItem("pending_import_fragment");
      sessionStorage.removeItem("pending_import_fragment");
    }
    if (fragment) {
      const decoded = decodeImportFragment(fragment);
      if (decoded) {
        setText(decoded);
        runPreview(decoded);
      }
    }
  }, []);

  const handleImport = () => {
    if (!parsed || parsed.type !== "workouts") return;
    const result = importWorkouts(parsed.payload, false);
    setFinished(result);
    setPreview(null);
  };

  // Deep-linked opens (#import= links) may have no history to go back to.
  const closeScreen = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const handleRestoreBackup = () => {
    if (!parsed || parsed.type !== "backup") return;
    const doRestore = async () => {
      await importAllData(parsed.raw);
      await initialize();
      if (Platform.OS === "web") window.alert("Backup restored.");
      closeScreen();
    };
    const message =
      "This is a full data export. Restoring it REPLACES ALL app data (logs, training maxes, day layouts). Continue?";
    if (Platform.OS === "web") {
      if (window.confirm(message)) doRestore();
    } else {
      require("react-native").Alert.alert("Restore Backup?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Replace All Data", style: "destructive", onPress: doRestore },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Import Data</Text>
      <Text style={styles.subtitle}>
        Paste a workout payload from Claude (or a full data export to restore a backup).
      </Text>

      <TextInput
        style={styles.pasteBox}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setParsed(null);
          setPreview(null);
          setFinished(null);
        }}
        placeholder='{"kind": "workout-logger-import", ...}'
        placeholderTextColor={colors.textDim}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!parsed && (
        <TouchableOpacity
          style={[styles.primaryBtn, !text.trim() && styles.btnDisabled]}
          disabled={!text.trim()}
          onPress={() => runPreview(text)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Preview</Text>
        </TouchableOpacity>
      )}

      {/* Errors */}
      {parsed?.type === "error" && (
        <View style={[styles.resultCard, { borderColor: colors.red }]}>
          <Text style={styles.errorTitle}>Can't import</Text>
          {parsed.errors.map((e, i) => (
            <Text key={i} style={styles.errorText}>• {e}</Text>
          ))}
        </View>
      )}

      {/* Backup restore */}
      {parsed?.type === "backup" && (
        <View style={[styles.resultCard, { borderColor: colors.red }]}>
          <Text style={styles.errorTitle}>Full backup detected</Text>
          <Text style={styles.warnText}>
            Restoring replaces ALL current app data.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.red, marginTop: spacing.lg }]}
            onPress={handleRestoreBackup}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Restore Backup…</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Preview */}
      {parsed?.type === "workouts" && preview && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Preview</Text>

          {parsed.warnings.map((wn, i) => (
            <Text key={i} style={styles.warnText}>⚠ {wn}</Text>
          ))}

          {preview.imported.map((w, i) => (
            <View key={i} style={styles.workoutRow}>
              <Text style={styles.workoutRowText}>
                {w.date} · {w.dayLabel}
              </Text>
              {w.attached && (
                <Text style={styles.attachBadge}>attaches to today's generated workout</Text>
              )}
            </View>
          ))}
          {preview.skipped.map((w, i) => (
            <View key={i} style={styles.workoutRow}>
              <Text style={[styles.workoutRowText, { color: colors.textMuted }]}>
                {w.date} · {w.dayLabel} — {w.reason}, will skip
              </Text>
            </View>
          ))}

          {preview.tmChanges.length > 0 && (
            <View style={styles.tmSection}>
              <Text style={styles.tmTitle}>Training max changes</Text>
              {preview.tmChanges.map((c) => (
                <Text key={c.name} style={styles.tmRow}>
                  {c.name}: {Math.round(c.from * 10) / 10} → {Math.round(c.to * 10) / 10}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { marginTop: spacing.lg },
              preview.imported.length === 0 && styles.btnDisabled,
            ]}
            disabled={preview.imported.length === 0}
            onPress={handleImport}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>
              Import {preview.imported.length} workout{preview.imported.length !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Done */}
      {finished && (
        <View style={[styles.resultCard, { borderColor: colors.green }]}>
          <Text style={[styles.resultTitle, { color: colors.green }]}>
            Imported {finished.imported.length} workout{finished.imported.length !== 1 ? "s" : ""}
          </Text>
          {finished.skipped.length > 0 && (
            <Text style={styles.warnText}>{finished.skipped.length} skipped (duplicates).</Text>
          )}
          {finished.tmChanges.map((c) => (
            <Text key={c.name} style={styles.tmRow}>
              {c.name}: {Math.round(c.from * 10) / 10} → {Math.round(c.to * 10) / 10}
            </Text>
          ))}
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: spacing.lg }]}
            onPress={closeScreen}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
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
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl, lineHeight: 20 },

  pasteBox: {
    backgroundColor: colors.bgCard,
    color: colors.text,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 160,
    fontSize: font.caption,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    textAlignVertical: "top" as const,
    marginBottom: spacing.lg,
  },

  primaryBtn: {
    backgroundColor: colors.amber,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: font.bodyLarge, fontWeight: font.bold, color: "#fff" },

  resultCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  resultTitle: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.text, marginBottom: spacing.md },
  errorTitle: { fontSize: font.subtitle, fontWeight: font.bold, color: colors.red, marginBottom: spacing.md },
  errorText: { fontSize: font.body, color: colors.red, marginBottom: spacing.xs, lineHeight: 20 },
  warnText: { fontSize: font.body, color: colors.amberDark, marginBottom: spacing.xs, lineHeight: 20 },

  workoutRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  workoutRowText: { fontSize: font.bodyLarge, color: colors.text, fontWeight: font.medium },
  attachBadge: { fontSize: font.caption, color: colors.amber, marginTop: 2 },

  tmSection: { marginTop: spacing.lg },
  tmTitle: { fontSize: font.body, fontWeight: font.semibold, color: colors.textSecondary, marginBottom: spacing.sm },
  tmRow: { fontSize: font.body, color: colors.textSecondary, marginBottom: 2 },
});
