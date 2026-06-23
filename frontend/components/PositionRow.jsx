import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function PositionRow({ pos }) {
  const router = useRouter();

  const invested = pos.quantity * pos.avgPrice;
  const current = pos.quantity * pos.currentPrice;
  const pl = current - invested;
  const up = pl >= 0;
  const plPct = invested ? (pl / invested) * 100 : 0;

  console.log(pos);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/stocks/${pos.symbol}`)}
      style={styles.row}
    >
      <View style={{ flex: 1.2 }}>
        <Text style={styles.name}>{pos.name}</Text>
        <Text style={styles.ticker}>
          {pos.symbol} • {pos.quantity} shares
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Buying</Text>
        <Text style={styles.value}>Rs.{pos.avgPrice.toFixed(2)}</Text>
        <Text style={styles.label}>Current</Text>
        <Text style={styles.value}>Rs.{pos.currentPrice.toFixed(2)}</Text>
      </View>

      <View style={{ width: 90, alignItems: "flex-end" }}>
        <Text style={styles.label}>P / L</Text>
        <Text style={[styles.pl, { color: up ? "#16C784" : "#EA3943" }]}>
          {up ? "+" : "-"}Rs.{Math.abs(pl).toFixed(2)}
        </Text>
        <View
          style={[styles.pill, { backgroundColor: up ? "#163D2B" : "#3D1B1B" }]}
        >
          <Text
            style={[styles.pillText, { color: up ? "#16C784" : "#EA3943" }]}
          >
            {up ? "+" : "-"}
            {Math.abs(plPct).toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  name: { color: "#e8eaed", fontWeight: "700" },
  ticker: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },
  label: { color: "#9aa0a6", fontSize: 11, marginTop: 4 },
  value: { color: "#e8eaed", fontSize: 13, marginTop: 2 },
  pl: { fontWeight: "700", marginTop: 4 },
  pill: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pillText: { fontSize: 11, fontWeight: "700" },
});
