// components/ai/StockAISignal.jsx
// AI signal panel for a single stock detail page. Brings the AI Insights
// visual language (health gauge, confidence bar, signal badge, risk metrics)
// onto the stock screen, derived purely from the prediction payload the page
// already fetches.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Gauge from "./Gauge";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Map predicted % change over the forecast window to a 0..100 conviction score.
function convictionScore(predictChange) {
  if (predictChange == null || !Number.isFinite(predictChange)) return 50;
  return Math.round(clamp(50 + predictChange * 6, 5, 95));
}

// Signal label + color band from the predicted move.
function signalFor(predictChange) {
  if (predictChange == null || !Number.isFinite(predictChange))
    return { label: "Analyzing", color: "#9aa0a6", verdict: "Gathering data" };
  if (predictChange >= 3)
    return { label: "Strong Bullish", color: "#16C784", verdict: "High conviction buy" };
  if (predictChange >= 0.5)
    return { label: "Bullish", color: "#16C784", verdict: "Favorable upside" };
  if (predictChange > -0.5)
    return { label: "Neutral", color: "#FFD700", verdict: "Hold / wait" };
  if (predictChange > -3)
    return { label: "Bearish", color: "#EA3943", verdict: "Caution advised" };
  return { label: "Strong Bearish", color: "#EA3943", verdict: "Avoid for now" };
}

// Volatility band from the 60-day coefficient of variation.
function volatilityBand(stats) {
  if (!stats || !stats.mean_60d) return { label: "—", color: "#9aa0a6", cvPct: null };
  const cvPct = (stats.stddev_60d / stats.mean_60d) * 100;
  if (cvPct < 1.5) return { label: "Low", color: "#16C784", cvPct };
  if (cvPct < 3.5) return { label: "Medium", color: "#FFD700", cvPct };
  return { label: "High", color: "#EA3943", cvPct };
}

// Confidence is higher when the stock has been less volatile.
function confidenceFrom(cvPct) {
  if (cvPct == null) return 70;
  return Math.round(clamp(100 - cvPct * 9, 35, 95));
}

function Metric({ label, value, color }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export default function StockAISignal({ predictChange, meta, horizonDays }) {
  const stats = meta?.input_stats ?? null;
  const signal = signalFor(predictChange);
  const score = convictionScore(predictChange);
  const vol = volatilityBand(stats);
  const confidence = confidenceFrom(vol.cvPct);
  const momentum = stats?.pct_change_30d;
  const up = predictChange != null && predictChange >= 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI Signal</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={11} color="#FFD700" />
          <Text style={styles.aiBadgeTxt}>AI Generated</Text>
        </View>
      </View>

      {/* Body: signal text + conviction gauge */}
      <View style={styles.body}>
        <View style={styles.left}>
          <View
            style={[
              styles.signalPill,
              { backgroundColor: up ? "#163D2B" : "#3D1B1B" },
            ]}
          >
            <Ionicons
              name={up ? "trending-up" : "trending-down"}
              size={13}
              color={signal.color}
            />
            <Text style={[styles.signalPillTxt, { color: signal.color }]}>
              {signal.label}
            </Text>
          </View>

          <Text style={styles.upsideLabel}>
            Predicted {up ? "Upside" : "Downside"}
            {horizonDays ? `, ${horizonDays}d` : ""}
          </Text>
          <Text style={[styles.upside, { color: signal.color }]}>
            {predictChange != null && Number.isFinite(predictChange)
              ? `${up ? "+" : ""}${predictChange.toFixed(2)}%`
              : "—"}
          </Text>
          <Text style={[styles.verdict, { color: signal.color }]}>
            {signal.verdict}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.gaugeLabel}>Conviction Score</Text>
          <Gauge
            value={score}
            size={120}
            strokeWidth={10}
            centerTop={
              <Text style={styles.score}>
                {score}
                <Text style={styles.scoreMax}> /100</Text>
              </Text>
            }
          />
        </View>
      </View>

      {/* Confidence bar */}
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

      {/* Risk metrics */}
      <View style={styles.riskHeader}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#9aa0a6" />
        <Text style={styles.riskTitle}>Risk Snapshot</Text>
      </View>
      <Metric label="Volatility" value={vol.label} color={vol.color} />
      <Metric
        label="30d Momentum"
        value={
          momentum != null && Number.isFinite(momentum)
            ? `${momentum >= 0 ? "+" : ""}${momentum.toFixed(2)}%`
            : "—"
        }
        color={momentum == null ? "#9aa0a6" : momentum >= 0 ? "#16C784" : "#EA3943"}
      />
      {stats && (
        <Metric
          label="60d Range"
          value={`${stats.min_60d.toFixed(2)}, ${stats.max_60d.toFixed(2)}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#101014",
    borderRadius: 16,
    padding: 18,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
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

  body: { flexDirection: "row", marginTop: 16, alignItems: "center" },
  left: { flex: 1, paddingRight: 12 },
  signalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  signalPillTxt: { fontSize: 13, fontWeight: "800" },
  upsideLabel: { color: "#9aa0a6", fontSize: 12 },
  upside: { fontSize: 26, fontWeight: "800", marginTop: 2 },
  verdict: { fontSize: 13, fontWeight: "700", marginTop: 4 },

  right: { alignItems: "center", width: 130 },
  gaugeLabel: { color: "#9aa0a6", fontSize: 11, marginBottom: 6, textAlign: "center" },
  score: { color: "#e8eaed", fontSize: 24, fontWeight: "800" },
  scoreMax: { color: "#9aa0a6", fontSize: 11, fontWeight: "600" },

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

  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    marginBottom: 4,
  },
  riskTitle: { color: "#e8eaed", fontSize: 14, fontWeight: "700" },
  metric: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1F1F1F",
  },
  metricLabel: { color: "#9aa0a6", fontSize: 13 },
  metricValue: { color: "#e8eaed", fontSize: 13, fontWeight: "700" },
});
