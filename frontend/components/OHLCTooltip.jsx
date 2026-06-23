import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useDerivedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { CandlestickChart, AnimatedText } from "react-native-wagmi-charts";

/**
 * Floating OHLC info box that mirrors the brokerage-style popup:
 *
 *   O 9.06   H 9.06
 *   L 9.02   C 9.03
 *   -0.03    -0.33%
 *   Jun 12, 11:15 AM
 *
 * The box is only visible while a candle is being scrubbed (crosshair active)
 * and its numbers come straight from the active candle, so the data is exact.
 * Up candles (close >= open) render green, down candles red.
 */
export default function OHLCTooltip({ rangeKey }) {
  const candle = CandlestickChart.useCandleData();

  // Daily ranges have no meaningful intraday time, so only show the clock for
  // intraday ranges to avoid printing a misleading "12:00 AM".
  const dateOptions = useMemo(() => {
    const intraday = rangeKey === "1D" || rangeKey === "5D";
    return intraday
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", year: "numeric" };
  }, [rangeKey]);

  // Hide the box entirely until a candle is selected.
  const containerStyle = useAnimatedStyle(() => ({
    opacity: candle.value.timestamp === -1 ? 0 : 1,
  }));

  // Colour all numeric values by candle direction (up = green, down = red).
  const valueColor = useAnimatedStyle(() => {
    const c = candle.value;
    const up = c.close >= c.open;
    return { color: up ? "#22c55e" : "#ef4444" };
  });

  const changeText = useDerivedValue(() => {
    const c = candle.value;
    if (c.timestamp === -1) return "";
    const diff = c.close - c.open;
    return (diff >= 0 ? "+" : "") + diff.toFixed(2);
  });

  const changePctText = useDerivedValue(() => {
    const c = candle.value;
    if (c.timestamp === -1 || c.open === 0) return "";
    const pct = ((c.close - c.open) / c.open) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.box, containerStyle]}
    >
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>O</Text>
          <CandlestickChart.PriceText
            type="open"
            style={[styles.value, valueColor]}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>H</Text>
          <CandlestickChart.PriceText
            type="high"
            style={[styles.value, valueColor]}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>L</Text>
          <CandlestickChart.PriceText
            type="low"
            style={[styles.value, valueColor]}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>C</Text>
          <CandlestickChart.PriceText
            type="close"
            style={[styles.value, valueColor]}
          />
        </View>
      </View>

      <View style={styles.row}>
        <AnimatedText text={changeText} style={[styles.change, valueColor]} />
        <AnimatedText
          text={changePctText}
          style={[styles.change, styles.changePct, valueColor]}
        />
      </View>

      <CandlestickChart.DatetimeText
        options={dateOptions}
        style={styles.datetime}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 10,
    backgroundColor: "rgba(16,16,20,0.92)",
    borderWidth: 1,
    borderColor: "#2A2E36",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 132,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    width: 64,
  },
  label: {
    color: "#E6EEF8",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
    padding: 0,
  },
  change: {
    fontSize: 12,
    fontWeight: "600",
    width: 64,
    padding: 0,
  },
  changePct: {
    marginLeft: 0,
  },
  datetime: {
    color: "#A7B1BC",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    padding: 0,
  },
});
