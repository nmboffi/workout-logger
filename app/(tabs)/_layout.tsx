import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1a1a2e" },
        headerTintColor: "#e0e0e0",
        tabBarStyle: { backgroundColor: "#1a1a2e", borderTopColor: "#333" },
        tabBarActiveTintColor: "#4fc3f7",
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🏋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: "Program",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>⚙</Text>
          ),
        }}
      />
    </Tabs>
  );
}
