// components/ai/MarketSentimentCard.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Gauge from "./Gauge";

export default function MarketSentimentCard({ sentiment }) {
  if (!sentiment) return null;
  const { score, label, color, blurb } = sentiment;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Market Sentiment</Text>
        <Ionicons name="information-circle-outline" size={14} color="#9aa0a6" />
      </View>

      <View style={styles.gaugeWrap}>
        <Gauge value={score} size={150} strokeWidth={12} needle centerTop={<View />} />
      </View>

      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={styles.score}>{score} / 100</Text>
      <Text style={styles.blurb}>{blurb}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 5 },
  title: { color: "#e8eaed", fontSize: 15, fontWeight: "800" },
  gaugeWrap: { alignItems: "center", marginTop: 10 },
  label: { fontSize: 18, fontWeight: "800", textAlign: "center", marginTop: 8 },
  score: { color: "#e8eaed", fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 2 },
  blurb: { color: "#9aa0a6", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 8 },
});
