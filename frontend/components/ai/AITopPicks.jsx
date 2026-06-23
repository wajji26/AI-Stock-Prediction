// components/ai/AITopPicks.jsx
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

function PickRow({ pick, onPress }) {
  const up = pick.bullish;
  const chg = Number(pick.changePercent) || 0;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{
          uri: `https://img.logo.dev/${pick.logo}?token=pk_P253PcFaTZepqM7o3SqeWw`,
        }}
        style={styles.logo}
      />
      <View style={styles.idCol}>
        <Text style={styles.sym}>{pick.symbol}</Text>
        <Text style={styles.sector}>{pick.sector}</Text>
      </View>

      <View style={styles.priceCol}>
        {Number.isFinite(pick.price) ? (
          <Text style={styles.price}>
            {pick.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        ) : null}
        <Text style={styles.priceLbl}>PKR</Text>
      </View>

      <View style={styles.rightCol}>
        <View style={[styles.signal, { backgroundColor: up ? "#163D2B" : "#3D1B1B" }]}>
          <Text style={[styles.signalTxt, { color: up ? "#16C784" : "#EA3943" }]}>
            {up ? "Bullish" : "Bearish"}
          </Text>
        </View>
        <Text style={[styles.upside, { color: chg >= 0 ? "#16C784" : "#EA3943" }]}>
          {chg >= 0 ? "+" : ""}
          {chg.toFixed(2)}%
        </Text>
        <Text style={styles.upsideLbl}>Today</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AITopPicks({ picks = [], updatedLabel }) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Top Movers</Text>
          <Text style={styles.sub}>Strongest momentum across the KSE-30</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/stocks")}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {picks.length === 0 ? (
        <Text style={styles.empty}>No market data available right now.</Text>
      ) : (
        picks.map((p) => (
          <PickRow
            key={p.symbol}
            pick={p}
            onPress={() => router.push(`/stocks/${p.symbol}`)}
          />
        ))
      )}

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={13} color="#9aa0a6" />
        <Text style={styles.footerTxt}>
          Ranked by today's intraday move and close-vs-range position
        </Text>
        {updatedLabel ? <Text style={styles.updated}>{updatedLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  title: { color: "#e8eaed", fontSize: 17, fontWeight: "800" },
  sub: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },
  viewAll: { color: "#FFD700", fontSize: 13, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  idCol: { width: 78 },
  sym: { color: "#e8eaed", fontWeight: "800", fontSize: 14 },
  sector: { color: "#9aa0a6", fontSize: 11, marginTop: 2 },
  priceCol: { flex: 1, alignItems: "center" },
  price: { color: "#e8eaed", fontSize: 14, fontWeight: "700" },
  priceLbl: { color: "#9aa0a6", fontSize: 10, marginTop: 2 },
  rightCol: { alignItems: "flex-end", width: 92 },
  signal: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  signalTxt: { fontSize: 10, fontWeight: "800" },
  upside: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  upsideLbl: { color: "#9aa0a6", fontSize: 9, marginTop: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  footerTxt: { color: "#9aa0a6", fontSize: 11, flex: 1 },
  updated: { color: "#6b7280", fontSize: 11 },
  empty: { color: "#9aa0a6", fontSize: 13, paddingHorizontal: 16, paddingVertical: 12 },
});
