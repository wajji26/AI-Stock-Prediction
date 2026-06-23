import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function emaSeries(values, period) {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(null);
  // Seed with SMA of first `period` values
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

function rsiSeries(values, period = 14) {
  const out = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function macdLatest(values) {
  if (values.length < 35) return null;
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  const macdLine = values.map((_, i) =>
    ema12[i] != null && ema26[i] != null ? ema12[i] - ema26[i] : null,
  );
  const macdValid = macdLine.filter((v) => v != null);
  const signalRaw = emaSeries(macdValid, 9);
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalRaw[signalRaw.length - 1];
  if (lastMacd == null || lastSignal == null) return null;
  return {
    macd: lastMacd,
    signal: lastSignal,
    hist: lastMacd - lastSignal,
  };
}

function rsiLabel(v) {
  if (v == null) return { text: "—", color: "#9aa0a6" };
  if (v >= 70) return { text: "Overbought", color: "#F05555" };
  if (v <= 30) return { text: "Oversold", color: "#0DBA7D" };
  if (v >= 55) return { text: "Bullish", color: "#0DBA7D" };
  if (v <= 45) return { text: "Bearish", color: "#F05555" };
  return { text: "Neutral", color: "#9aa0a6" };
}

export default function TechnicalIndicators({ chart }) {
  const indicators = useMemo(() => {
    const history = chart?.history;
    if (!Array.isArray(history) || history.length === 0) return null;
    const closes = history
      .map((c) => Number(c.close))
      .filter((v) => Number.isFinite(v));
    if (closes.length < 20) return null;

    const ema20 = emaSeries(closes, 20);
    const ema50 = emaSeries(closes, 50);
    const rsi = rsiSeries(closes, 14);
    const macd = macdLatest(closes);
    const lastClose = closes[closes.length - 1];

    return {
      lastClose,
      ema20: ema20[ema20.length - 1],
      ema50: ema50[ema50.length - 1],
      rsi: rsi[rsi.length - 1],
      macd,
    };
  }, [chart]);

  if (!indicators) return null;

  const { lastClose, ema20, ema50, rsi, macd } = indicators;
  const ema20Trend = ema20 != null && lastClose >= ema20;
  const ema50Trend = ema50 != null && lastClose >= ema50;
  const rsiInfo = rsiLabel(rsi);
  const macdBullish = macd ? macd.hist >= 0 : null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="pulse" size={16} color="#87CEEB" />
        <Text style={styles.title}>Technical Indicators</Text>
      </View>

      {/* RSI */}
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.label}>RSI (14)</Text>
          <Text style={styles.subLabel}>Relative Strength Index</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.value}>
            {rsi != null ? rsi.toFixed(2) : "—"}
          </Text>
          <Text style={[styles.tag, { color: rsiInfo.color }]}>
            {rsiInfo.text}
          </Text>
        </View>
      </View>

      {/* EMA 20 */}
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.label}>EMA (20)</Text>
          <Text style={styles.subLabel}>Short-term trend</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.value}>
            {ema20 != null ? ema20.toFixed(2) : "—"}
          </Text>
          <Text
            style={[
              styles.tag,
              { color: ema20Trend ? "#0DBA7D" : "#F05555" },
            ]}
          >
            {ema20 == null
              ? "—"
              : ema20Trend
              ? "Price above"
              : "Price below"}
          </Text>
        </View>
      </View>

      {/* EMA 50 */}
      {ema50 != null && (
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.label}>EMA (50)</Text>
            <Text style={styles.subLabel}>Medium-term trend</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.value}>{ema50.toFixed(2)}</Text>
            <Text
              style={[
                styles.tag,
                { color: ema50Trend ? "#0DBA7D" : "#F05555" },
              ]}
            >
              {ema50Trend ? "Price above" : "Price below"}
            </Text>
          </View>
        </View>
      )}

      {/* MACD */}
      <View style={[styles.row, styles.rowLast]}>
        <View style={styles.left}>
          <Text style={styles.label}>MACD (12, 26, 9)</Text>
          <Text style={styles.subLabel}>Momentum</Text>
        </View>
        <View style={styles.right}>
          {macd ? (
            <>
              <Text style={styles.value}>
                {macd.macd.toFixed(2)}{" "}
                <Text style={styles.signalTxt}>
                  / sig {macd.signal.toFixed(2)}
                </Text>
              </Text>
              <Text
                style={[
                  styles.tag,
                  { color: macdBullish ? "#0DBA7D" : "#F05555" },
                ]}
              >
                {macdBullish ? "Bullish crossover" : "Bearish crossover"} (
                {macd.hist >= 0 ? "+" : ""}
                {macd.hist.toFixed(2)})
              </Text>
            </>
          ) : (
            <Text style={styles.value}>—</Text>
          )}
        </View>
      </View>

      <Text style={styles.footnote}>
        Calculated from the {chart?.history?.length ?? 0}-bar chart window above.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#101014",
    padding: 18,
    borderRadius: 16,
    marginVertical: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 6,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1f24",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
    flex: 1,
  },
  label: {
    color: "#E6EEF8",
    fontSize: 13,
    fontWeight: "600",
  },
  subLabel: {
    color: "#7A7A7A",
    fontSize: 11,
    marginTop: 2,
  },
  value: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  signalTxt: {
    color: "#8B96A5",
    fontWeight: "500",
    fontSize: 12,
  },
  tag: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  footnote: {
    color: "#5a606a",
    fontSize: 11,
    marginTop: 12,
    fontStyle: "italic",
  },
});
