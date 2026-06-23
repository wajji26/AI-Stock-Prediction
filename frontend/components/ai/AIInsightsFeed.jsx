// components/ai/AIInsightsFeed.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const toneColor = (tone) =>
  tone === "up" ? "#16C784" : tone === "down" ? "#EA3943" : "#FFD700";
const toneBg = (tone) =>
  tone === "up" ? "#163D2B" : tone === "down" ? "#3D1B1B" : "#2A2410";

function FeedItem({ item, last }) {
  return (
    <View style={[styles.item, !last && styles.itemBorder]}>
      <View style={[styles.iconWrap, { backgroundColor: toneBg(item.tone) }]}>
        <Ionicons name={`${item.icon}-outline`} size={16} color={toneColor(item.tone)} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.topLine}>
          <Text style={[styles.tag, { color: toneColor(item.tone) }]}>{item.tag}</Text>
          {item.time ? <Text style={styles.time}>{item.time}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function AIInsightsFeed({ feed = [] }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>AI Insights</Text>
      </View>
      {feed.length === 0 ? (
        <Text style={styles.empty}>No insights generated yet.</Text>
      ) : (
        feed.map((it, i) => (
          <FeedItem key={it.id} item={it} last={i === feed.length - 1} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  heading: { color: "#e8eaed", fontSize: 17, fontWeight: "800" },
  viewAll: { color: "#16C784", fontSize: 12, fontWeight: "700" },
  item: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#1F1F1F" },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tag: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  time: { color: "#6b7280", fontSize: 11 },
  title: { color: "#e8eaed", fontSize: 13, fontWeight: "700", marginTop: 3 },
  body: { color: "#9aa0a6", fontSize: 12, lineHeight: 16, marginTop: 3 },
  empty: { color: "#9aa0a6", fontSize: 13, paddingVertical: 12 },
});
