// components/ai/StockSmartSummaryCard.jsx
// Stock-specific "Smart Summary" mirroring the AI Insights page card,
// but with a narrative grounded in the live quote and prediction stats.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Gauge from "./Gauge";

export default function StockSmartSummaryCard({ summary }) {
  if (!summary) return null;
  const { health = 0, confidence = 0, verdict = "—", narrative } = summary;
  const verdictColor =
    health >= 70 ? "#16C784" : health >= 55 ? "#FFD700" : "#EA3943";

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
          {narrative ? (
            <Text style={styles.analysis}>
              {narrative.lead}
              {narrative.hl1 ? (
                <Text
                  style={[
                    styles.hl,
                    { color: narrative.hl1.positive ? "#16C784" : "#EA3943" },
                  ]}
                >
                  {narrative.hl1.text}
                </Text>
              ) : null}
              {narrative.mid}
              {narrative.hl2 ? (
                <Text
                  style={[
                    styles.hl,
                    { color: narrative.hl2.positive ? "#16C784" : "#EA3943" },
                  ]}
                >
                  {narrative.hl2.text}
                </Text>
              ) : null}
              {narrative.tail}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={styles.gaugeLabel}>Stock Health Score</Text>
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

      <View style={styles.confRow}>
        <View style={styles.confLabelRow}>
          <Text style={styles.confLabel}>AI Confidence</Text>
          <Ionicons name="information-circle-outline" size={13} color="#9aa0a6" />
        </View>
        <Text style={styles.confValue}>{confidence}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${confidence}%` }]} />
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
  verdict: { fontSize: 13, fontWeight: "700", marginTop: 4, textAlign: "center" },
  confRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  confLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  confLabel: { color: "#9aa0a6", fontSize: 13 },
  confValue: { color: "#16C784", fontSize: 14, fontWeight: "800" },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#23262d",
    marginTop: 8,
    overflow: "hidden",
  },
  barFill: { height: 7, borderRadius: 4, backgroundColor: "#FFD700" },
});
