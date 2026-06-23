import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { fetchSparkline } from "../../data/community";

// Live closing-price sparkline for an idea card. Fetches the symbol's 1mo
// history once and renders a lightweight area line colored by trade side.
export default function MiniChart({ symbol, side, width, height = 120 }) {
  const [points, setPoints] = useState(null); // null = loading, [] = no data
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetchSparkline(symbol)
      .then((closes) => {
        if (mounted.current) setPoints(closes);
      })
      .catch(() => mounted.current && setPoints([]));
    return () => {
      mounted.current = false;
    };
  }, [symbol]);

  const color =
    side === "long" ? "#16C784" : side === "short" ? "#EA3943" : "#FFD700";

  const data = useMemo(
    () => (points || []).map((v) => ({ value: v })),
    [points],
  );

  if (points === null) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color="#555" />
      </View>
    );
  }

  if (data.length < 2) {
    return <View style={{ height }} />;
  }

  return (
    <View style={{ height, overflow: "hidden" }} pointerEvents="none">
      <LineChart
        data={data}
        width={width}
        height={height}
        areaChart
        curved
        hideDataPoints
        hideRules
        hideYAxisText
        hideAxesAndRules
        xAxisThickness={0}
        yAxisThickness={0}
        initialSpacing={0}
        endSpacing={0}
        adjustToWidth
        color={color}
        thickness={2}
        startFillColor={color}
        endFillColor={color}
        startOpacity={0.25}
        endOpacity={0.02}
        disableScroll
      />
    </View>
  );
}
