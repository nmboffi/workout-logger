import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, radius, font } from "../lib/theme";

const CORRECT_PIN = "6248";
const STORAGE_KEY = "workout_pin_ok";

export function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    }
    return false;
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = () => {
    if (pin === CORRECT_PIN) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Workout Logger</Text>
        <Text style={styles.subtitle}>Enter PIN to continue</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={(t) => { setPin(t); setError(false); }}
          onSubmitEditing={handleSubmit}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="• • • •"
          placeholderTextColor={colors.textDim}
          autoFocus
        />
        {error && <Text style={styles.error}>Wrong PIN</Text>}
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.btnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: font.title, fontWeight: font.bold, color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginBottom: spacing.xxl },
  input: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
    fontSize: font.heading,
    fontWeight: font.bold,
    textAlign: "center",
    width: 160,
    height: 56,
    borderRadius: radius.md,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.red, fontSize: font.body, marginTop: spacing.sm },
  btn: {
    backgroundColor: colors.amber,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
  },
  btnText: { color: "#fff", fontSize: font.bodyLarge, fontWeight: font.bold },
});
