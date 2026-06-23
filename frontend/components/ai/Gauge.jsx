// components/ai/Gauge.jsx
// Semicircular gauge used for the Portfolio Health Score and the
// Fear & Greed sentiment meter. Pure react-native-svg, theme-consistent.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";

// angle: 180 (left) -> 0 (right) sweeping over the top
function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arcPath(cx, cy, r, a0, a1) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const largeArc = Math.abs(a0 - a1) > 180 ? 1 : 0;
  // a0 > a1 (e.g. 180 -> 0) draws clockwise over the top => sweepFlag 1
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
}

const SEGMENTS = [
  { from: 0, to: 0.25, color: "#EA3943" }, // red
  { from: 0.25, to: 0.5, color: "#FF8A00" }, // orange
  { from: 0.5, to: 0.75, color: "#FFD700" }, // gold
  { from: 0.75, to: 1, color: "#16C784" }, // green
];

export default function Gauge({
  value = 0, // 0..100
  max = 100,
  size = 150,
  strokeWidth = 12,
  centerTop = null, // big number node (defaults to value)
  centerBottom = null, // small label under number
  needle = false,
  trackGap = 0.012,
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const w = size;
  const h = size / 2 + strokeWidth;
  const cx = w / 2;
  const cy = h - strokeWidth / 2;
  const r = w / 2 - strokeWidth / 2;

  const angleFor = (t) => 180 - t * 180;

  return (
    <View style={{ width: w, alignItems: "center" }}>
      <Svg width={w} height={h}>
        {/* Colored segment track */}
        <G>
          {SEGMENTS.map((s, i) => (
            <Path
              key={i}
              d={arcPath(cx, cy, r, angleFor(s.from + trackGap), angleFor(s.to - trackGap))}
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              opacity={needle ? 1 : 0.28}
            />
          ))}
          {/* Progress overlay for the score variant (non-needle) */}
          {!needle && (
            <Path
              d={arcPath(cx, cy, r, 180, angleFor(pct))}
              stroke={
                pct >= 0.75 ? "#16C784" : pct >= 0.5 ? "#FFD700" : pct >= 0.25 ? "#FF8A00" : "#EA3943"
              }
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          )}
          {/* Needle for the sentiment variant */}
          {needle &&
            (() => {
              const a = angleFor(pct);
              const tip = polar(cx, cy, r - 4, a);
              return (
                <>
                  <Path
                    d={`M ${cx} ${cy} L ${tip.x} ${tip.y}`}
                    stroke="#e8eaed"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <Circle cx={cx} cy={cy} r={6} fill="#e8eaed" />
                </>
              );
            })()}
        </G>
      </Svg>

      <View style={[styles.center, { top: h - size / 2.6 }]}>
        {centerTop != null ? (
          centerTop
        ) : (
          <Text style={styles.value}>{Math.round(value)}</Text>
        )}
        {centerBottom}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", alignItems: "center" },
  value: { color: "#e8eaed", fontSize: 28, fontWeight: "800" },
});
