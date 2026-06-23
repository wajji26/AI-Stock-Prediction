import React, { useMemo } from "react";
import { View, Text, ActivityIndicator, Dimensions } from "react-native";
import { CandlestickChart } from "react-native-wagmi-charts";
import OHLCTooltip from "./OHLCTooltip";

function toMsTimestamp(t) {
  if (t == null) return null;

  // if already a number (ms)
  if (typeof t === "number" && Number.isFinite(t)) return t;

  // If your backend ever sends seconds (10-digit), convert to ms
  if (typeof t === "string" && /^\d+$/.test(t)) {
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return n < 1e12 ? n * 1000 : n; // seconds -> ms
  }

  if (typeof t !== "string") return null;

  // Handle ISO strings and date strings
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Intelligently downsample candles to optimal count for clean rendering
 * Uses bucketing to preserve price action while reducing clutter
 */
const SLOT_WIDTH = 9;
// Fraction of each slot occupied by the candle body; the remainder is the gap
// between candles (gives the clean, separated brokerage look in all ranges).
const CANDLE_FILL = 0.66;

function optimizeCandles(candles, rangeKey, chartWidth) {
  if (!Array.isArray(candles) || candles.length === 0) return [];

  // Uniform density across all ranges: one candle per ~SLOT_WIDTH px of chart.
  const targetCount = Math.max(
    20,
    Math.min(candles.length, Math.floor(chartWidth / SLOT_WIDTH)),
  );

  if (candles.length <= targetCount) return candles;

  // Calculate bucket size
  const bucketSize = Math.ceil(candles.length / targetCount);
  const result = [];

  // Group candles into buckets and create aggregated candles
  for (let i = 0; i < candles.length; i += bucketSize) {
    const bucket = candles.slice(i, i + bucketSize);

    if (bucket.length === 0) continue;

    // For each bucket, create a candle that represents the period
    const aggregated = {
      timestamp: bucket[0].timestamp, // Use first timestamp
      open: bucket[0].open,
      close: bucket[bucket.length - 1].close,
      high: Math.max(...bucket.map((c) => c.high)),
      low: Math.min(...bucket.map((c) => c.low)),
    };

    result.push(aggregated);
  }

  return result;
}

function getMinMax(candles) {
  if (!candles || candles.length === 0) return { min: 0, max: 0 };

  let min = Infinity;
  let max = -Infinity;

  for (const c of candles) {
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  if (min === max) return { min: min * 0.95, max: max * 1.05 };

  // Add 3% padding to top and bottom for better visualization
  const range = max - min;
  const padding = range * 0.03;

  return {
    min: min - padding,
    max: max + padding,
  };
}

function niceStep(rawStep) {
  if (rawStep <= 0) return 1;

  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const n = rawStep / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function buildYTicks(min, max, count = 5) {
  if (min === max) return [min];

  const range = max - min;
  const rawStep = range / (count - 1);
  const step = niceStep(rawStep);

  // Start from a nice round number at or below min
  const start = Math.floor(min / step) * step;

  const ticks = [];
  let currentTick = start;

  // Generate ticks
  while (currentTick <= max && ticks.length < count + 2) {
    if (currentTick >= min - step * 0.01) {
      ticks.push(currentTick);
    }
    currentTick += step;
  }

  // Ensure we always have min and max for better alignment
  if (ticks.length === 0 || Math.abs(ticks[0] - min) > step * 0.1) {
    ticks.unshift(min);
  }
  if (
    ticks.length === 0 ||
    Math.abs(ticks[ticks.length - 1] - max) > step * 0.1
  ) {
    ticks.push(max);
  }

  // Take evenly spaced ticks if we have too many
  if (ticks.length > count) {
    const step = (ticks.length - 1) / (count - 1);
    const finalTicks = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round(i * step);
      finalTicks.push(ticks[idx]);
    }
    return finalTicks;
  }

  return ticks;
}

function buildXTicks(candles, count = 4) {
  if (!candles?.length) return [];

  const last = candles.length - 1;
  const ticks = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * last) / (count - 1));
    ticks.push({ idx, ts: candles[idx].timestamp });
  }

  return ticks;
}

function formatX(ts, rangeKey) {
  const d = new Date(ts);

  if (rangeKey === "1D") {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (rangeKey === "5D") {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  if (rangeKey === "1M") {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  if (rangeKey === "6M") {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  // 1Y / ALL
  return d.toLocaleDateString([], { month: "short", year: "2-digit" });
}

function formatYValue(value) {
  // Format based on magnitude
  if (value >= 1000) {
    return value.toFixed(0);
  } else if (value >= 100) {
    return value.toFixed(1);
  } else {
    return value.toFixed(2);
  }
}

export default function StockCandleChart({ chart, loading, rangeKey }) {
  const W = Dimensions.get("window").width;

  const candleData = useMemo(() => {
    const candles = chart?.history;
    if (!Array.isArray(candles) || candles.length === 0) return [];

    return candles
      .map((p) => {
        const timestamp = toMsTimestamp(p.timestamp);
        if (timestamp == null) return null;

        const open = Number(p.open);
        const high = Number(p.high);
        const low = Number(p.low);
        const close = Number(p.close);

        if (![open, high, low, close].every(Number.isFinite)) return null;

        return { timestamp, open, high, low, close };
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [chart]);

  const AXIS_Y_W = 55;
  const PADDING_H = 16;
  const CHART_W = W - PADDING_H * 2 - AXIS_Y_W;

  // Optimize candles for clean rendering
  const displayCandles = useMemo(
    () => optimizeCandles(candleData, rangeKey, CHART_W),
    [candleData, rangeKey, CHART_W],
  );

  const { min, max } = useMemo(
    () => getMinMax(displayCandles),
    [displayCandles],
  );

  const yTicks = useMemo(() => {
    return buildYTicks(min, max, 5);
  }, [min, max]);

  const xTicks = useMemo(
    () => buildXTicks(displayCandles, 4),
    [displayCandles],
  );

  if (loading) {
    return (
      <View
        style={{
          height: 300,
          borderRadius: 14,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B0E11",
        }}
      >
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!candleData.length) {
    return (
      <View
        style={{
          height: 300,
          borderRadius: 14,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#101014",
        }}
      >
        <Text style={{ color: "#A7B1BC", fontSize: 14 }}>
          No chart data available
        </Text>
      </View>
    );
  }

  const fallbackNotice =
    chart?.fallback && chart?.range && chart?.requestedRange
      ? `Showing ${chart.range}/${chart.interval} (intraday data unavailable for ${chart.requestedRange})`
      : null;

  return (
    <View
      style={{
        backgroundColor: "#101014",
        borderRadius: 14,
        paddingBottom: 16,
      }}
    >
      {fallbackNotice && (
        <Text
          style={{
            color: "#8B96A5",
            fontSize: 10,
            paddingHorizontal: PADDING_H,
            paddingTop: 10,
          }}
        >
          {fallbackNotice}
        </Text>
      )}
      <CandlestickChart.Provider data={displayCandles}>
        {/* Chart + Y axis */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: PADDING_H,
            paddingTop: 12,
          }}
        >
          {/* Chart */}
          <View style={{ width: CHART_W }}>
            <CandlestickChart height={250} width={CHART_W}>
              <CandlestickChart.Candles
                positiveColor="#22c55e"
                negativeColor="#ef4444"
                // Leave a gap between candles so they read as discrete bars
                // (brokerage style) instead of a solid block.
                candleWidth={
                  displayCandles.length > 0
                    ? (CHART_W / displayCandles.length) * CANDLE_FILL
                    : SLOT_WIDTH * CANDLE_FILL
                }
              />
              {/* Vertical scrubbing line; OHLC values are shown in the
                  floating box above instead of an inline tooltip. */}
              <CandlestickChart.Crosshair color="#6B7280" />
            </CandlestickChart>
            {/* Brokerage-style OHLC popup overlaid on the chart, visible
                while scrubbing (rendered last so it stacks on top). */}
            <OHLCTooltip rangeKey={rangeKey} />
          </View>

          {/* Y axis labels */}
          <View
            style={{
              width: AXIS_Y_W,
              justifyContent: "space-between",
              paddingLeft: 10,
              paddingRight: "3",
              height: 250,
              paddingVertical: 2,
            }}
          >
            {yTicks
              .slice()
              .reverse()
              .map((v, i) => (
                <Text
                  key={`y-${i}`}
                  style={{
                    color: "#8B96A5",
                    fontSize: 9,
                    fontWeight: "500",
                  }}
                >
                  {formatYValue(v)}
                </Text>
              ))}
          </View>
        </View>

        {/* X axis labels */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: PADDING_H,
            paddingTop: 8,
          }}
        >
          <View
            style={{
              width: CHART_W,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {xTicks.map((t, i) => (
              <Text
                key={`x-${i}`}
                style={{
                  color: "#8B96A5",
                  fontSize: 9,
                  fontWeight: "500",
                }}
              >
                {formatX(t.ts, rangeKey)}
              </Text>
            ))}
          </View>
        </View>
      </CandlestickChart.Provider>
    </View>
  );
}
