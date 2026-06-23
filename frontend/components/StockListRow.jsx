import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

function fmtVolume(v) {
  if (v == null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}

function fmt(n, d = 2) {
  return n == null || !Number.isFinite(Number(n)) ? "-" : Number(n).toFixed(d);
}

export default function StockListRow({ stock }) {
  const router = useRouter();
  const {
    symbol,
    name,
    logo,
    price,
    changePercent,
    changeAbsolute,
    open,
    high,
    low,
    volume,
  } = stock;

  const pct = Number(changePercent ?? 0);
  const abs = Number(changeAbsolute ?? 0);
  const up = pct >= 0;
  const color = up ? "#16C784" : "#EA3943";
  const ldcp =
    price != null && changeAbsolute != null
      ? Number(price) - Number(changeAbsolute)
      : open;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/stocks/${symbol}`)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Image
          source={{
            uri: `https://img.logo.dev/${logo}?token=pk_P253PcFaTZepqM7o3SqeWw`,
          }}
          style={styles.logo}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol} numberOfLines={1}>
            {symbol}
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
        </View>
      </View>

      <View style={styles.middle}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>HIGH</Text>
          <Text style={styles.cellValue}>{fmt(high)}</Text>
          <Text style={styles.cellLabel}>VOLUME</Text>
          <Text style={styles.cellValue}>{fmtVolume(volume)}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>LOW</Text>
          <Text style={styles.cellValue}>{fmt(low)}</Text>
          <Text style={styles.cellLabel}>LDCP</Text>
          <Text style={styles.cellValue}>{fmt(ldcp)}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Ionicons
          name={up ? "caret-up" : "caret-down"}
          size={14}
          color={color}
          style={{ marginBottom: 2 }}
        />
        <Text style={styles.price}>{fmt(price)}</Text>
        <Text style={[styles.delta, { color }]}>
          {up ? "+" : ""}
          {abs.toFixed(2)} ({up ? "+" : ""}
          {pct.toFixed(2)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1f24",
  },
  left: { width: 110, flexDirection: "row", alignItems: "center" },
  logo: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  symbol: { color: "#e8eaed", fontWeight: "800", fontSize: 14 },
  name: { color: "#9aa0a6", fontSize: 10, marginTop: 2 },

  middle: { flex: 1, flexDirection: "row", paddingHorizontal: 6 },
  cell: { flex: 1 },
  cellLabel: { color: "#6b7280", fontSize: 9, letterSpacing: 0.4 },
  cellValue: {
    color: "#e8eaed",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },

  right: { alignItems: "flex-end", minWidth: 92 },
  price: { color: "#e8eaed", fontSize: 16, fontWeight: "700" },
  delta: { fontSize: 11, fontWeight: "600", marginTop: 2 },
});
