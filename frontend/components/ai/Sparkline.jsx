// components/ai/Sparkline.jsx
// Tiny trend chart for AI Top Picks rows. Pure SVG, no axes.
import React from "react";
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon } from "react-native-svg";

export default function Sparkline({ data = [], width = 78, height = 34, up = true }) {
  if (!data || data.length < 2) return null;
  const color = up ? "#16C784" : "#EA3943";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 3;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return [x, y];
  });

  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const gid = `spark-${up ? "u" : "d"}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Polygon points={area} fill={`url(#${gid})`} />
      <Polyline points={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
