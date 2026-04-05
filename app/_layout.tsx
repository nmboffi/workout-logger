import { useEffect } from "react";
import { Stack } from "expo-router";
import { useStore } from "../lib/store";
import { colors, font } from "../lib/theme";

export default function RootLayout() {
  const initialize = useStore((s) => s.initialize);
  const initialized = useStore((s) => s.initialized);

  useEffect(() => {
    initialize();
  }, []);

  if (!initialized) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="workout"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Workout",
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: font.semibold },
        }}
      />
      <Stack.Screen
        name="swap"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Swap Exercise",
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: font.semibold },
        }}
      />
    </Stack>
  );
}
