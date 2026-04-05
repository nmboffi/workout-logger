import { useEffect } from "react";
import { Stack } from "expo-router";
import { useStore } from "../lib/store";

export default function RootLayout() {
  const initialize = useStore((s) => s.initialize);
  const initialized = useStore((s) => s.initialized);

  useEffect(() => {
    initialize();
  }, []);

  if (!initialized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="workout"
        options={{ presentation: "modal", headerShown: true, title: "Workout" }}
      />
      <Stack.Screen
        name="swap"
        options={{ presentation: "modal", headerShown: true, title: "Swap Exercise" }}
      />
    </Stack>
  );
}
