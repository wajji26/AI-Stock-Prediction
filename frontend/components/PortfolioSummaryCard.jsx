import { StyleSheet, Text, View } from "react-native";

export default function PortfolioSummaryCard({ summary }) {
  const up = summary.pl >= 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Portfolio Value</Text>
      <Text style={styles.value}>Rs.{summary.currentValue.toFixed(2)}</Text>

      <View style={styles.row}>
        <View>
          <Text style={styles.subLabel}>Invested</Text>
          <Text style={styles.subValue}>
            Rs.{summary.totalInvested.toFixed(2)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.subLabel}>P / L</Text>
          <Text
            style={[styles.subValue, { color: up ? "#16C784" : "#EA3943" }]}
          >
            {up ? "+" : "-"}Rs.{Math.abs(summary.pl).toFixed(2)} (
            {up ? "+" : "-"}
            {Math.abs(summary.plPercent).toFixed(2)}%)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  label: { color: "#9aa0a6", fontSize: 12 },
  value: { color: "#e8eaed", fontSize: 24, fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  subLabel: { color: "#9aa0a6", fontSize: 12 },
  subValue: { color: "#e8eaed", marginTop: 2, fontSize: 14, fontWeight: "600" },
});
