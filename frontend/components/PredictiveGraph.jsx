// PredictiveGraph.jsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import { LineChart } from "react-native-wagmi-charts";
import { Ionicons } from "@expo/vector-icons";

// Safe parse for "YYYY-MM-DD" into UTC midnight (ms)
function toMs(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

function niceStep(rawStep) {
  if (rawStep <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const n = rawStep / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function buildYTicks(min, max, count = 5) {
  if (count < 2) return [min];
  if (min === max) return [min];

  const raw = (max - min) / (count - 1);
  const step = niceStep(raw || 1);
  const start = Math.floor(min / step) * step;

  const ticks = [];
  for (let i = 0; i < count; i++) {
    const tick = start + i * step;
    if (tick >= min - step * 0.1 && tick <= max + step * 0.1) {
      ticks.push(tick);
    }
  }

  return ticks.length > 0 ? ticks : [min, max];
}

function formatDay(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullDay(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return value.toLocaleString("en-PK", { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

function plainSummary({ symbol, days, current, end, high, low, changePct }) {
  if (!Number.isFinite(changePct)) {
    return `Forecast for ${symbol || "this stock"} over the next ${days} trading days.`;
  }
  const dir =
    changePct > 1
      ? "rise"
      : changePct < -1
        ? "fall"
        : "stay roughly flat";
  const magnitude = Math.abs(changePct).toFixed(2);
  const sym = symbol || "the stock";
  return `Based on recent price patterns, the model expects ${sym} to ${dir} by about ${magnitude}% over the next ${days} trading days, closing near Rs ${formatPrice(end)} (today: Rs ${formatPrice(current)}). The forecast ranges between Rs ${formatPrice(low)} (low) and Rs ${formatPrice(high)} (high).`;
}

export default function PredictiveGraph({
  predictions = null,
  loading = false,
  title = "AI Price Forecast",
  symbol = "",
  currentPrice = null,
}) {
  // Extract predictions array from API response
  const predictionData = useMemo(() => {
    if (!predictions) return [];
    return Array.isArray(predictions)
      ? predictions
      : predictions.predictions || [];
  }, [predictions]);

  // Map predictions to chart data
  const data = useMemo(() => {
    if (!Array.isArray(predictionData) || predictionData.length === 0)
      return [];

    const mapped = predictionData
      .map((p) => {
        const ts = toMs(p.date);
        const value = Number(p.price);
        if (!ts || !Number.isFinite(value)) return null;
        return { timestamp: ts, value };
      })
      .filter(Boolean);

    mapped.sort((a, b) => a.timestamp - b.timestamp);
    return mapped;
  }, [predictionData]);

  // UI sizing
  const screenW = Dimensions.get("window").width;
  const CHART_HEIGHT = 220;
  const Y_AXIS_W = 56;
  const PADDING_X = 16;
  const CHART_INNER_PADDING_X = 10;
  const chartW =
    screenW - PADDING_X * 2 - Y_AXIS_W - CHART_INNER_PADDING_X * 2;

  // Derived stats
  const stats = useMemo(() => {
    if (!data.length) return null;
    const values = data.map((d) => d.value);
    const high = Math.max(...values);
    const low = Math.min(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const start = data[0].value;
    const end = data[data.length - 1].value;
    const baseline =
      Number.isFinite(Number(currentPrice)) && Number(currentPrice) > 0
        ? Number(currentPrice)
        : start;
    const changePct = ((end - baseline) / baseline) * 100;
    const highIdx = values.indexOf(high);
    const lowIdx = values.indexOf(low);
    return {
      high,
      low,
      avg,
      start,
      end,
      baseline,
      changePct,
      highIdx,
      lowIdx,
      days: data.length,
    };
  }, [data, currentPrice]);

  // X domain
  const xDomain = useMemo(() => {
    if (!data.length) return undefined;
    return [data[0].timestamp, data[data.length - 1].timestamp];
  }, [data]);

  // Y range, include the baseline so its reference line is visible
  const yRange = useMemo(() => {
    if (!data.length) return undefined;

    let min = Infinity;
    let max = -Infinity;
    for (const p of data) {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    }
    if (stats?.baseline != null && Number.isFinite(stats.baseline)) {
      if (stats.baseline < min) min = stats.baseline;
      if (stats.baseline > max) max = stats.baseline;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
    if (min === max) return { min: min * 0.95, max: max * 1.05 };

    const pad = (max - min) * 0.12; // a bit more headroom for markers
    const step = niceStep((max - min) / 4 || 1);

    const yMin = Math.floor((min - pad) / step) * step;
    const yMax = Math.ceil((max + pad) / step) * step;
    return { min: yMin, max: yMax };
  }, [data, stats]);

  // Y ticks (right labels, top→bottom)
  const yTicks = useMemo(() => {
    if (!yRange) return [];
    return buildYTicks(yRange.min, yRange.max, 5).slice().reverse();
  }, [yRange]);

  // X ticks (bottom labels)
  const xTicks = useMemo(() => {
    if (!xDomain || !data.length) return [];
    const count = Math.min(5, data.length);
    const ticks = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i * (data.length - 1)) / (count - 1));
      ticks.push(data[idx].timestamp);
    }
    return ticks;
  }, [xDomain, data]);

  // Compute pixel positions for overlays
  const positions = useMemo(() => {
    if (!data.length || !yRange || !stats) return null;
    const yPx = (v) => {
      const r = yRange.max - yRange.min;
      if (r <= 0) return CHART_HEIGHT / 2;
      return ((yRange.max - v) / r) * CHART_HEIGHT;
    };
    const xPx = (i) => {
      if (data.length <= 1) return chartW / 2;
      return (i / (data.length - 1)) * chartW;
    };
    return {
      baselineY: yPx(stats.baseline),
      startX: xPx(0),
      startY: yPx(stats.start),
      endX: xPx(data.length - 1),
      endY: yPx(stats.end),
      highX: xPx(stats.highIdx),
      highY: yPx(stats.high),
      lowX: xPx(stats.lowIdx),
      lowY: yPx(stats.low),
    };
  }, [data, yRange, stats, chartW]);

  const up = stats ? stats.changePct >= 0 : true;
  const lineColor = up ? "#4ADE80" : "#F87171";

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.bybitHeader}>
          <Text style={styles.bybitTitle}>{title}</Text>
          <View style={[styles.bybitUnderline, { backgroundColor: "#4ADE80" }]} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#4ADE80" size="large" />
          <Text style={styles.loadingText}>Generating predictions…</Text>
        </View>
      </View>
    );
  }

  if (!data.length || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.bybitHeader}>
          <Text style={styles.bybitTitle}>{title}</Text>
          <View style={[styles.bybitUnderline, { backgroundColor: "#4ADE80" }]} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No prediction data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.bybitHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.bybitTitle}>{title}</Text>
          {!!symbol && (
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolBadgeText}>{symbol}</Text>
            </View>
          )}
        </View>
        <View style={[styles.bybitUnderline, { backgroundColor: lineColor }]} />
        <Text style={styles.subTitle}>
          Next {stats.days} trading days • model projection
        </Text>
      </View>

      {/* Headline: today → forecast end */}
      <View style={styles.headlineCard}>
        <View style={styles.headlineCol}>
          <Text style={styles.headlineLabel}>Today</Text>
          <Text style={styles.headlineValue}>Rs {formatPrice(stats.baseline)}</Text>
        </View>
        <View style={styles.arrowCol}>
          <Ionicons
            name={up ? "arrow-forward" : "arrow-forward"}
            size={16}
            color="#8B96A5"
          />
          <View
            style={[
              styles.changePill,
              { backgroundColor: up ? "#0F3D2B" : "#3D1B1B" },
            ]}
          >
            <Ionicons
              name={up ? "trending-up" : "trending-down"}
              size={12}
              color={up ? "#4ADE80" : "#F87171"}
            />
            <Text
              style={[
                styles.changePillText,
                { color: up ? "#4ADE80" : "#F87171" },
              ]}
            >
              {up ? "+" : ""}
              {stats.changePct.toFixed(2)}%
            </Text>
          </View>
        </View>
        <View style={[styles.headlineCol, { alignItems: "flex-end" }]}>
          <Text style={styles.headlineLabel}>
            In {stats.days} days
          </Text>
          <Text
            style={[
              styles.headlineValue,
              { color: up ? "#4ADE80" : "#F87171" },
            ]}
          >
            Rs {formatPrice(stats.end)}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <LineChart.Provider data={data} yRange={yRange} xDomain={xDomain}>
          {/* Cursor price (top), shows price at the point you press */}
          <View style={styles.cursorPriceContainer}>
            <View style={styles.cursorRow}>
              <Text style={styles.cursorHint}>Tap & drag the chart →</Text>
              <View style={{ flex: 1 }} />
              <LineChart.PriceText
                style={styles.cursorPrice}
                format={({ value }) => {
                  "worklet";
                  const n = Number(value);
                  if (!Number.isFinite(n)) return "";
                  return `Rs ${n >= 1000 ? n.toFixed(0) : n.toFixed(2)}`;
                }}
              />
            </View>
            <LineChart.DatetimeText style={styles.cursorDate} />
          </View>

          {/* Chart + Y-axis */}
          <View style={styles.chartRow}>
            {/* Chart */}
            <View style={styles.chartWrapper}>
              <View
                style={{
                  width: chartW,
                  height: CHART_HEIGHT,
                  position: "relative",
                }}
              >
                {/* Horizontal grid lines aligned with Y ticks */}
                {yTicks.map((v, i) => {
                  const r = yRange.max - yRange.min;
                  const y = r > 0 ? ((yRange.max - v) / r) * CHART_HEIGHT : 0;
                  return (
                    <View
                      key={`grid-${i}`}
                      style={[
                        styles.gridLine,
                        { top: y, width: chartW },
                      ]}
                    />
                  );
                })}

                {/* Baseline (today's price) reference line */}
                {positions && (
                  <View
                    style={[
                      styles.baselineLine,
                      { top: positions.baselineY, width: chartW },
                    ]}
                  />
                )}

                <LineChart width={chartW} height={CHART_HEIGHT}>
                  <LineChart.Path color={lineColor} width={2.2}>
                    <LineChart.Gradient color={lineColor} />
                  </LineChart.Path>

                  <LineChart.CursorCrosshair
                    color="#6B7280"
                    outerSize={40}
                    size={8}
                  >
                    <LineChart.Tooltip
                      position="top"
                      textStyle={styles.tooltipText}
                    />
                  </LineChart.CursorCrosshair>
                </LineChart>

                {/* Start marker */}
                {positions && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.markerDot,
                      {
                        left: positions.startX - 4,
                        top: positions.startY - 4,
                        backgroundColor: "#E6EEF8",
                        borderColor: "#0B0B0F",
                      },
                    ]}
                  />
                )}
                {/* End marker */}
                {positions && (
                  <>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.markerDotLarge,
                        {
                          left: positions.endX - 6,
                          top: positions.endY - 6,
                          backgroundColor: lineColor,
                          borderColor: "#0B0B0F",
                        },
                      ]}
                    />
                    <View
                      pointerEvents="none"
                      style={[
                        styles.endLabel,
                        {
                          // Anchor the label to the right of the dot, but
                          // flip it to the left if it would overflow.
                          left:
                            positions.endX + 70 > chartW
                              ? Math.max(0, positions.endX - 78)
                              : positions.endX + 8,
                          top: Math.max(0, positions.endY - 10),
                          borderColor: lineColor,
                        },
                      ]}
                    >
                      <Text style={[styles.endLabelText, { color: lineColor }]}>
                        Rs {formatPrice(stats.end)}
                      </Text>
                    </View>
                  </>
                )}

                {/* High marker */}
                {positions && stats.highIdx !== stats.lowIdx && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.peakLabel,
                      {
                        left: Math.min(
                          chartW - 70,
                          Math.max(0, positions.highX - 30),
                        ),
                        top: Math.max(0, positions.highY - 22),
                      },
                    ]}
                  >
                    <Text style={styles.peakText}>
                      ▲ Rs {formatPrice(stats.high)}
                    </Text>
                  </View>
                )}
                {/* Low marker */}
                {positions && stats.highIdx !== stats.lowIdx && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.peakLabel,
                      {
                        left: Math.min(
                          chartW - 70,
                          Math.max(0, positions.lowX - 30),
                        ),
                        top: Math.min(
                          CHART_HEIGHT - 18,
                          positions.lowY + 6,
                        ),
                      },
                    ]}
                  >
                    <Text style={[styles.peakText, { color: "#F87171" }]}>
                      ▼ Rs {formatPrice(stats.low)}
                    </Text>
                  </View>
                )}

                {/* Baseline label (top-left of the line) */}
                {positions && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.baselineLabel,
                      {
                        top: Math.max(
                          0,
                          Math.min(CHART_HEIGHT - 16, positions.baselineY - 16),
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.baselineLabelText}>
                      Today Rs {formatPrice(stats.baseline)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Y-axis labels */}
            <View style={styles.yAxisContainer}>
              {yTicks.map((v, i) => (
                <Text key={`y-${i}`} style={styles.yAxisLabel}>
                  Rs {formatPrice(v)}
                </Text>
              ))}
            </View>
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxisContainer}>
            <View style={[styles.xAxisLabels, { width: chartW }]}>
              {xTicks.map((ts, i) => (
                <Text key={`x-${i}`} style={styles.xAxisLabel}>
                  {formatDay(ts)}
                </Text>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: lineColor }]} />
              <Text style={styles.legendText}>Forecast price</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDashed} />
              <Text style={styles.legendText}>Today&apos;s price</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.legendPeak}>▲ ▼</Text>
              <Text style={styles.legendText}>High / Low</Text>
            </View>
          </View>
        </LineChart.Provider>
      </View>

      {/* Forecast stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Forecast High</Text>
          <Text style={[styles.statValue, { color: "#4ADE80" }]}>
            Rs {formatPrice(stats.high)}
          </Text>
          <Text style={styles.statSub}>
            {formatFullDay(data[stats.highIdx].timestamp)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Forecast Low</Text>
          <Text style={[styles.statValue, { color: "#F87171" }]}>
            Rs {formatPrice(stats.low)}
          </Text>
          <Text style={styles.statSub}>
            {formatFullDay(data[stats.lowIdx].timestamp)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={styles.statValue}>Rs {formatPrice(stats.avg)}</Text>
          <Text style={styles.statSub}>across {stats.days} days</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Day 1 → Day {stats.days}</Text>
          <Text
            style={[
              styles.statValue,
              {
                color: stats.end >= stats.start ? "#4ADE80" : "#F87171",
              },
            ]}
          >
            Rs {formatPrice(stats.start)} → Rs {formatPrice(stats.end)}
          </Text>
          <Text style={styles.statSub}>
            {stats.end >= stats.start ? "+" : ""}
            {(((stats.end - stats.start) / stats.start) * 100).toFixed(2)}% over period
          </Text>
        </View>
      </View>

      {/* Plain-language explainer */}
      {/* <View style={styles.explainerCard}>
        <View style={styles.explainerHead}>
          <Ionicons name="bulb" size={14} color="#FFD700" />
          <Text style={styles.explainerTitle}>In plain English</Text>
        </View>
        <Text style={styles.explainerBody}>
          {plainSummary({
            symbol,
            days: stats.days,
            current: stats.baseline,
            end: stats.end,
            high: stats.high,
            low: stats.low,
            changePct: stats.changePct,
          })}
        </Text>
        <Text style={styles.explainerCaveat}>
          Not financial advice. Forecasts are based on past prices and can be
          wrong, news, earnings, and market shocks aren&apos;t included.
        </Text>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },

  bybitHeader: {
    marginBottom: 12,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  bybitTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  symbolBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#1B2230",
    borderWidth: 1,
    borderColor: "#2A3346",
  },
  symbolBadgeText: {
    color: "#87CEEB",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  bybitUnderline: {
    marginTop: 6,
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#4ADE80",
  },

  subTitle: {
    color: "#8B96A5",
    fontSize: 12,
    marginTop: 8,
  },

  loadingContainer: {
    height: 320,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101014",
    marginTop: 12,
  },

  loadingText: {
    color: "#A7B1BC",
    fontSize: 13,
    marginTop: 12,
  },

  emptyContainer: {
    height: 320,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101014",
    marginTop: 12,
  },

  emptyText: {
    color: "#A7B1BC",
    fontSize: 14,
  },

  /* HEADLINE */
  headlineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101014",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  headlineCol: {
    flex: 1,
  },
  headlineLabel: {
    color: "#8B96A5",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headlineValue: {
    color: "#E6EEF8",
    fontSize: 18,
    fontWeight: "700",
  },
  arrowCol: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  chartContainer: {
    borderRadius: 14,
    backgroundColor: "#101014",
    paddingVertical: 16,
    paddingHorizontal: 10,
  },

  cursorPriceContainer: {
    marginBottom: 10,
  },
  cursorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cursorHint: {
    color: "#5B6370",
    fontSize: 10,
    fontStyle: "italic",
  },
  cursorPrice: {
    color: "#E6EEF8",
    fontSize: 15,
    fontWeight: "700",
  },
  cursorDate: {
    color: "#A7B1BC",
    fontSize: 10,
    marginTop: 2,
    textAlign: "right",
  },

  chartRow: {
    flexDirection: "row",
  },
  chartWrapper: {
    // width is intrinsic to chartW from props
  },

  /* OVERLAYS */
  gridLine: {
    position: "absolute",
    left: 0,
    height: 1,
    backgroundColor: "#1A1F29",
  },
  baselineLine: {
    position: "absolute",
    left: 0,
    height: 1,
    backgroundColor: "#FFD70066",
    borderStyle: "dashed",
    borderTopWidth: 1,
    borderColor: "#FFD70099",
  },
  baselineLabel: {
    position: "absolute",
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#1B1500",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFD70055",
  },
  baselineLabelText: {
    color: "#FFD700",
    fontSize: 9,
    fontWeight: "700",
  },
  markerDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  markerDotLarge: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  endLabel: {
    position: "absolute",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#0E1A14",
    borderRadius: 4,
    borderWidth: 1,
  },
  endLabelText: {
    fontSize: 10,
    fontWeight: "700",
  },
  peakLabel: {
    position: "absolute",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "#0B0B0F",
  },
  peakText: {
    color: "#4ADE80",
    fontSize: 10,
    fontWeight: "700",
  },

  yAxisContainer: {
    width: 56,
    height: 220,
    justifyContent: "space-between",
    paddingLeft: 8,
    paddingVertical: 2,
  },

  yAxisLabel: {
    color: "#8B96A5",
    fontSize: 9,
    fontWeight: "500",
  },

  xAxisContainer: {
    marginTop: 8,
  },

  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  xAxisLabel: {
    color: "#8B96A5",
    fontSize: 9,
    fontWeight: "500",
  },

  tooltipText: {
    color: "#E6EEF8",
    fontSize: 11,
    fontWeight: "600",
  },

  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A1F29",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendDashed: {
    width: 14,
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#FFD700",
  },
  legendPeak: {
    color: "#4ADE80",
    fontSize: 10,
    fontWeight: "700",
  },
  legendText: {
    color: "#8B96A5",
    fontSize: 10,
  },

  /* STAT GRID */
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#101014",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginTop: 10,
  },
  statItem: {
    width: "50%",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statLabel: {
    color: "#8B96A5",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    color: "#E6EEF8",
    fontSize: 14,
    fontWeight: "700",
  },
  statSub: {
    color: "#5B6370",
    fontSize: 10,
    marginTop: 2,
  },

  /* EXPLAINER */
  explainerCard: {
    backgroundColor: "#101014",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  explainerHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  explainerTitle: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  explainerBody: {
    color: "#E6EEF8",
    fontSize: 13,
    lineHeight: 19,
  },
  explainerCaveat: {
    color: "#8B96A5",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    fontStyle: "italic",
  },
});
