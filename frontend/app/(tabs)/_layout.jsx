import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      sceneContainerStyle={{ backgroundColor: "#05060A" }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0D0D0D",
          borderTopColor: "#1A1A1A",
          height: 100,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: "#FFD700",
        tabBarInactiveTintColor: "#888",

        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: "#05060A" }} />
        ),
      }}
      safeAreaInsets={{ bottom: 0 }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="stocks"
        options={{
          title: "Stocks",
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart-outline" size={22} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace("/(tabs)/stocks");
          },
        }}
      />

      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarLabelStyle: { color: "#FFD700", fontWeight: "700" },
          tabBarIcon: () => (
            <Ionicons name="wallet-outline" size={22} color="#FFD700" />
          ),
        }}
      />

      <Tabs.Screen
        name="ai-insights"
        options={{
          title: "AI Insights",
          tabBarIcon: ({ color }) => (
            <Ionicons name="sparkles-outline" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="news"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="screener"
        options={{
          title: "Screener",
          tabBarIcon: ({ color }) => (
            <Ionicons name="funnel-outline" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="notification"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="watchlist"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="brokers"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          href: null, // hidden
        }}
      />

      {/* <Tabs.Screen
        name="portfolio/add-stock"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="stocks/[ticker]"
        options={{
          href: null, // hidden
        }}
      />

      <Tabs.Screen
        name="news/[id]"
        options={{
          href: null, // hidden
        }}
      /> */}
    </Tabs>
  );
}
