// NotificationScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const NotificationScreen = () => {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notification</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconButton, { marginLeft: 12 }]}>
            {/* <Feather name="settings" size={20} color="#FFFFFF" /> */}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <View>
          <Text style={styles.tabActiveText}>All</Text>
          <View style={styles.tabIndicator} />
        </View>
        {/* Add more tabs later if you want */}
      </View>

      {/* Empty state */}
      <View style={styles.emptyWrapper}>
        <Ionicons
          name="notifications-outline"
          size={60}
          color="#FFFFFF"
          style={styles.bellIcon}
        />
        <Text style={styles.emptyText}>No Updates</Text>
      </View>
    </View>
  );
};

export default NotificationScreen;

const BYBIT_YELLOW = "#F0B90B";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 6,
    borderRadius: 999,
  },

  tabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1A1A1A",
  },
  tabActiveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tabIndicator: {
    marginTop: 6,
    height: 3,
    width: 26,
    borderRadius: 999,
    backgroundColor: BYBIT_YELLOW,
  },

  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bellWrapper: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  bellBar: {
    position: "absolute",
    width: 30,
    height: 70,
    backgroundColor: BYBIT_YELLOW,
    bottom: 20,
    borderRadius: 10,
    opacity: 0.75,
  },
  bellIcon: {
    zIndex: 2,
  },
  emptyText: {
    marginTop: 22,
    fontSize: 16,
    color: "#7C7C7C",
  },
});
