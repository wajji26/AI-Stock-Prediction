import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

export default function EventsList({ items }) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row" }}>
        <Text style={styles.title}>Latest Events</Text>
        <Text style={styles.muted}> News</Text>
      </View>
      {items.slice(0, 3).map((e) => (
        <TouchableOpacity
          onPress={() => router.push(`/news/${e.id}`)}
          key={e.title}
          style={{ marginTop: 12 }}
        >
          <Text style={styles.item}>
            {e.title.length > 30 ? e.title.slice(0, 100) + "..." : e.title}
          </Text>

          <Text style={styles.date}>{e.date}</Text>
        </TouchableOpacity>
      ))}
      <Text onPress={() => router.push("/news")} style={styles.more}>
        More <Ionicons name="chevron-forward" size={12} color="#e8eaed" />
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginTop: 20,
  },
  title: { color: "#e8eaed", fontWeight: "800" },
  muted: { color: "#9aa0a6", fontWeight: "700" },
  item: { color: "#e8eaed" },
  date: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },
  more: { color: "#e8eaed", opacity: 0.9, alignSelf: "center", marginTop: 14 },
});
