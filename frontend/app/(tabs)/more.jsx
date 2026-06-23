import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ITEMS = [
  {
    icon: "calendar-outline",
    label: "Calendar",
    desc: "PSX earnings, dividends & listings",
    route: "/calendar",
  },
  {
    icon: "people-circle-outline",
    label: "Community",
    desc: "Trade ideas shared by other investors",
    route: "/community",
  },
  {
    icon: "people-outline",
    label: "Brokers",
    desc: "Open an account with a PSX broker",
    route: "/brokers",
  },
  {
    icon: "newspaper-outline",
    label: "News",
    desc: "Latest market headlines",
    route: "/news",
  },
];

export default function MoreScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {ITEMS.map((it) => (
          <TouchableOpacity
            key={it.label}
            style={styles.item}
            onPress={() => router.push(it.route)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={it.icon} size={20} color="#FFD700" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>{it.label}</Text>
              <Text style={styles.itemDesc}>{it.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7280" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: { color: "#e8eaed", fontSize: 20, fontWeight: "700" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { color: "#e8eaed", fontSize: 15, fontWeight: "700" },
  itemDesc: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },
});
