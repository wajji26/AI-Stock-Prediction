// components/ai/RiskAnalysisCard.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const bandColor = (band) =>
  band === "High" ? "#EA3943" : band === "Medium" ? "#FFD700" : "#16C784";

function Metric({ label, value, color }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export default function RiskAnalysisCard({ risk }) {
  if (!risk) return null;
  const { level, levelColor, volatility, portVolPct, losersPct, holdings, advice } = risk;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Analysis</Text>
        <Ionicons name="information-circle-outline" size={14} color="#9aa0a6" />
      </View>

      <Text style={[styles.level, { color: levelColor }]}>{level}</Text>

      <Metric label="Volatility" value={volatility} color={bandColor(volatility)} />
      <Metric
        label="Today's stdev"
        value={`${(portVolPct || 0).toFixed(2)}%`}
        color="#e8eaed"
      />
      {holdings > 0 ? (
        <Metric
          label="Underwater"
          value={`${losersPct}% (${holdings} held)`}
          color={losersPct > 50 ? "#EA3943" : losersPct > 25 ? "#FFD700" : "#16C784"}
        />
      ) : null}

      <Text style={styles.advice}>{advice}</Text>
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
  level: { fontSize: 18, fontWeight: "800", marginTop: 10, marginBottom: 6 },
  metric: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#1F1F1F",
  },
  metricLabel: { color: "#9aa0a6", fontSize: 13 },
  metricValue: { color: "#e8eaed", fontSize: 13, fontWeight: "700" },
  advice: { color: "#FFD700", fontSize: 12, fontWeight: "600", marginTop: 10 },
});
