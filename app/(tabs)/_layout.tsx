import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { colors, font } from "../../lib/theme";

function TabIcon({ label, active }: { label: string; active: boolean }) {
  const icons: Record<string, string> = {
    Workout: "W",
    Program: "P",
    History: "H",
    Settings: "S",
  };
  return (
    <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
      <Text style={[styles.iconText, active && styles.iconTextActive]}>
        {icons[label] ?? "?"}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: font.semibold, fontSize: font.subtitle },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: font.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Workout",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Workout" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: "Program",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Program" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="History" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Settings" active={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.amberSubtle,
  },
  iconText: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.tabInactive,
  },
  iconTextActive: {
    color: colors.amber,
  },
});
