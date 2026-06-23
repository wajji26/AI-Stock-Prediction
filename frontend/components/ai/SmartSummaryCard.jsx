// components/ai/SmartSummaryCard.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Gauge from "./Gauge";

export default function SmartSummaryCard({ summary }) {
  if (!summary) return null;
  const {
    health = 0,
    verdict = "—",
    outperformance = 0,
    indexName = "KSE-30 average",
    hasData,
  } = summary;

  const out = outperformance >= 0;
  const verdictColor =
    health >= 75 ? "#16C784" : health >= 55 ? "#FFD700" : "#EA3943";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Smart Summary</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={11} color="#FFD700" />
          <Text style={styles.aiBadgeTxt}>AI Generated</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.left}>
          <View style={styles.brainWrap}>
            <Ionicons name="hardware-chip-outline" size={18} color="#FFD700" />
          </View>
          {hasData ? (
            <Text style={styles.analysis}>
              Your portfolio is{" "}
              <Text style={[styles.hl, { color: out ? "#16C784" : "#EA3943" }]}>
                {out ? "outperforming" : "underperforming"} the {indexName}
              </Text>{" "}
              by{" "}
              <Text style={[styles.hl, { color: out ? "#16C784" : "#EA3943" }]}>
                {Math.abs(outperformance).toFixed(2)}%
              </Text>{" "}
              today.
            </Text>
          ) : (
            <Text style={styles.analysis}>
              Add holdings to your portfolio to see an AI health analysis and
              benchmark comparison.
            </Text>
          )}
        </View>

        <View style={styles.right}>
          <Text style={styles.gaugeLabel}>Portfolio Health Score</Text>
          <Gauge
            value={health}
            size={120}
            strokeWidth={10}
            centerTop={
              <Text style={styles.score}>
                {health}
                <Text style={styles.scoreMax}> /100</Text>
              </Text>
            }
          />
          <Text style={[styles.verdict, { color: verdictColor }]}>{verdict}</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: "#e8eaed", fontSize: 18, fontWeight: "800" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2A2410",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeTxt: { color: "#FFD700", fontSize: 10, fontWeight: "700" },
  body: { flexDirection: "row", marginTop: 16 },
  left: { flex: 1, paddingRight: 12 },
  brainWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2A2410",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  analysis: { color: "#c5c9ce", fontSize: 14, lineHeight: 20 },
  hl: { fontWeight: "800" },
  right: { alignItems: "center", width: 130 },
  gaugeLabel: {
    color: "#9aa0a6",
    fontSize: 11,
    marginBottom: 6,
    textAlign: "center",
  },
  score: { color: "#e8eaed", fontSize: 26, fontWeight: "800" },
  scoreMax: { color: "#9aa0a6", fontSize: 11, fontWeight: "600" },
  verdict: { fontSize: 13, fontWeight: "700", marginTop: 4 },
});
