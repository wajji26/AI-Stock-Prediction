import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useData } from "../../../context/DataContext";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../config/config";
import ConfirmModal from "../../../components/ConfirmModal";

// Bybit-ish theme
const BG = "#141414";
const CARD = "#1B1B1B";
const CARD_2 = "#171717";
const BORDER = "#2A2A2A";
const MUTED = "#A7A7A7";
const TEXT = "#F2F2F2";
const YELLOW = "#FFD700";

const formatMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(2);
};

const formatPct = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(2)}%`;
};

export default function EditPortfolioScreen() {
  // Replace this with your fetched portfolio rows
  const { apiData, setApiData } = useData();
  const { token } = useAuth();

  const router = useRouter();

  const [rows, setRows] = useState([
    { symbol: "", name: "", quantity: "0", avgPrice: "0", currentPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!apiData?.length) return;

    setRows(
      apiData.map((r) => ({
        symbol: r.symbol,
        name: r.name ?? "",
        quantity: String(r.quantity ?? ""),
        avgPrice: String(r.avgPrice ?? ""),
        currentPrice: Number(r.currentPrice ?? 0),
      }))
    );
  }, [apiData]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // payload: only what's editable
      const payload = rows.map((r) => ({
        symbol: r.symbol,
        quantity: Number(r.quantity) || 0,
        buyPrice: Number(r.avgPrice) || 0, // (or avgPrice → map to buyPrice)
      }));

      const res = await fetch(`${API_URL}/api/portfolio/update-holdings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payload }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.log("Update failed:", err);
        return;
      }

      const data = await res.json();

      // optionally refresh local rows from server response
      // setRows(data.holdings);

      console.log("Updated:", data);
    } catch (e) {
      console.log("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (symbol, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.symbol === symbol ? { ...r, ...patch } : r))
    );
  };

  const deleteRow = async (symbol) => {
    const prevRows = rows;
    const prevApiData = apiData;

    // Optimistic UI: remove from both local rows and shared context
    setRows((p) => p.filter((r) => r.symbol !== symbol));
    if (Array.isArray(apiData)) {
      setApiData(apiData.filter((r) => r.symbol !== symbol));
    }

    try {
      const res = await fetch(`${API_URL}/api/portfolio/${symbol}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Delete failed (${res.status})`);
      }
    } catch (e) {
      // Roll back both UI and context on failure
      setRows(prevRows);
      setApiData(prevApiData);
      Alert.alert("Error", e?.message || "Delete failed");
    }
  };

  console.log(apiData);

  const stockRows = rows.map((r) => {
    const invested = r.quantity * r.avgPrice;
    const current = r.quantity * r.currentPrice;
    const pl = current - invested;
    const up = pl >= 0;
    const plPct = invested ? (pl / invested) * 100 : 0;

    return (
      <View key={r.symbol} style={styles.rowCard}>
        <View style={styles.rowTop}>
          <View style={styles.stockCol}>
            <Text style={styles.symbol}>{r.symbol}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.pctLine}>
              <Text style={styles.muted}>Change: </Text>
              <Text style={[styles.pct, up ? styles.up : styles.down]}>
                {formatPct(plPct)}
              </Text>
            </Text>
          </View>

          {/* <Pressable style={styles.deleteBtn} onPress={() => deleteRow(r.id)}>
            <Ionicons name="trash-outline" size={16} color={TEXT} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable> */}
          <ConfirmModal
            style={styles.deleteBtn}
            func={() => deleteRow(r.symbol)}
            icon={<Ionicons name="trash-outline" size={16} color={TEXT} />}
            confirmActionName="Delete"
            textStyle={styles.deleteText}
            actionBtnColor="#FF5252"
          />
        </View>

        <View style={styles.rowGrid}>
          {/* Qty */}
          <View style={styles.field}>
            <Text style={styles.label}>Shares</Text>
            <TextInput
              value={String(r.quantity)}
              onChangeText={(t) =>
                updateRow(r.symbol, { quantity: t.replace(/[^0-9.]/g, "") })
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#666"
              style={styles.input}
            />
          </View>

          {r.quantity === 0 && (
            <View style={styles.errorField}>
              <Text style={styles.down}>Shares can't be 0</Text>
            </View>
          )}

          {/* Buy */}
          <View style={styles.field}>
            <Text style={styles.label}>Buy Price</Text>
            <TextInput
              value={String(r.avgPrice)}
              onChangeText={(t) =>
                updateRow(r.symbol, { avgPrice: t.replace(/[^0-9.]/g, "") })
              }
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#666"
              style={styles.input}
            />
          </View>

          {r.avgPrice == 0 && (
            <View style={styles.errorField}>
              <Text style={styles.down}>Buy Price Can't be 0</Text>
            </View>
          )}

          {/* Current */}
          <View style={styles.field}>
            <Text style={styles.label}>Current</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>
                {formatMoney(r.currentPrice)}
              </Text>
            </View>
          </View>

          {/* P/L */}
          <View style={styles.field}>
            <Text style={styles.label}>P/L</Text>
            <View style={styles.readonlyBox}>
              <Text style={[styles.readonlyText, up ? styles.up : styles.down]}>
                {Number.isFinite(pl) ? formatMoney(pl) : "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rowBottom}>
          <MiniMeta
            label="Cost"
            value={Number.isFinite(invested) ? formatMoney(invested) : "—"}
          />
          <MiniMeta
            label="Value"
            value={Number.isFinite(current) ? formatMoney(current) : "—"}
          />
          <MiniMeta
            style={up ? styles.up : styles.down}
            label="% Change"
            value={formatPct(plPct)}
          />
        </View>
      </View>
    );
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </Pressable>
          {/* <Text style={styles.title}>Edit Portfolio</Text> */}
          <View style={{ width: 30 }} />
        </View>

        {/* <Pressable
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={16} color={BG} />
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable> */}
        <ConfirmModal
          func={handleSave}
          disabled={saving}
          confirmActionName="Save Changes"
          style={[styles.saveBtn, styles.saveBtnText]}
          icon={<Ionicons name="checkmark" size={16} color={BG} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Chart placeholder */}
        {/* <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Performance Chart</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Placeholder</Text>
            </View>
          </View>

          <View style={styles.chartPlaceholder}>
            <Ionicons name="stats-chart" size={22} color={MUTED} />
            <Text style={styles.chartText}>Add your chart component here</Text>
            <Text style={styles.chartHint}>
              e.g. react-native-wagmi-charts / victory-native
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatBox label="Horizon" value={aiStats.horizon} />
            <StatBox
              label="Confidence"
              value={`${Math.round(aiStats.confidence * 100)}%`}
            />
            <StatBox label="Volatility" value={aiStats.volatility} />
            <StatBox
              label="Predicted"
              value={formatPct(aiStats.predictChangePct)}
            />
          </View>
        </View> */}

        {/* AI Suggestion */}
        {/* <View style={[styles.card, styles.aiCard]}>
          <View style={styles.aiTop}>
            <View style={styles.aiLeft}>
              <Text style={styles.cardTitle}>AI Suggestion</Text>
              <Text style={styles.aiDesc}>
                Based on your stats + model output
              </Text>
            </View>

            <View
              style={[
                styles.aiPill,
                aiSuggestion.tone === "buy" && styles.aiPillBuy,
                aiSuggestion.tone === "sell" && styles.aiPillSell,
                aiSuggestion.tone === "hold" && styles.aiPillHold,
              ]}
            >
              <Text style={styles.aiPillText}>{aiSuggestion.label}</Text>
            </View>
          </View>

          <Text style={styles.aiText}>{aiSuggestion.text}</Text>

          <View style={styles.aiActions}>
            <Pressable
              style={[styles.aiBtn, styles.aiBtnGhost]}
              onPress={() => {}}
            >
              <Text style={styles.aiBtnGhostText}>View rationale</Text>
            </Pressable>
            <Pressable
              style={[styles.aiBtn, styles.aiBtnSolid]}
              onPress={() => {}}
            >
              <Text style={styles.aiBtnSolidText}>Set alert</Text>
            </Pressable>
          </View>
        </View> */}

        {/* Editable stocks list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Holdings</Text>
          <Text style={styles.sectionSub}>Edit buy price & shares</Text>
        </View>

        {/* <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 1.35 }]}>Stock</Text>
          <Text style={[styles.th, { flex: 1 }]}>Qty</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>Buy</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>Now</Text>
          <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>
            P/L
          </Text>
        </View> */}

        {stockRows}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniMeta({ label, value, style }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, style]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { padding: 16, paddingBottom: 24 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    // paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#e8eaed",
    fontSize: 16,
    fontWeight: "700",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: TEXT, fontSize: 16, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 12, marginTop: 2 },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: YELLOW,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  saveBtnText: { color: BG, fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  badge: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: MUTED, fontSize: 11 },

  chartPlaceholder: {
    marginTop: 12,
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chartText: { color: TEXT, fontSize: 12, fontWeight: "600" },
  chartHint: { color: MUTED, fontSize: 11 },

  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  statBox: {
    flexGrow: 1,
    minWidth: "48%",
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
  },
  statLabel: { color: MUTED, fontSize: 11 },
  statValue: { color: TEXT, fontSize: 13, fontWeight: "700", marginTop: 6 },

  aiCard: {
    borderColor: "rgba(255,215,0,0.25)",
  },
  aiTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiLeft: { flex: 1, paddingRight: 10 },
  aiDesc: { color: MUTED, fontSize: 11, marginTop: 4 },

  aiPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
  },
  aiPillText: { color: TEXT, fontSize: 12, fontWeight: "800" },
  aiPillBuy: { borderColor: "rgba(255,215,0,0.55)" },
  aiPillSell: { borderColor: "rgba(255,82,82,0.55)" },
  aiPillHold: { borderColor: "rgba(167,167,167,0.55)" },

  aiText: { color: TEXT, fontSize: 12, marginTop: 10, lineHeight: 18 },
  aiActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  aiBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  aiBtnGhost: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
  },
  aiBtnGhostText: { color: TEXT, fontSize: 12, fontWeight: "600" },
  aiBtnSolid: { backgroundColor: YELLOW },
  aiBtnSolidText: { color: BG, fontSize: 12, fontWeight: "800" },

  sectionHeader: { marginTop: 6, marginBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  sectionSub: { color: MUTED, fontSize: 11, marginTop: 4 },

  tableHead: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  th: { color: MUTED, fontSize: 11, fontWeight: "700" },

  rowCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  stockCol: { flex: 1, minWidth: 0 },

  symbol: { color: TEXT, fontSize: 14, fontWeight: "900" },
  name: { color: MUTED, fontSize: 12, marginTop: 2 },
  pctLine: { marginTop: 8, fontSize: 12 },
  muted: { color: MUTED },
  pct: { fontWeight: "800" },
  up: { color: "#16C784" },
  down: { color: "#FF5252" },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    alignSelf: "flex-start",
  },
  deleteText: { color: TEXT, fontSize: 12, fontWeight: "600" },

  rowGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  field: { minWidth: "48%", flexGrow: 1 },
  errorField: { minWidth: "50%", fontSize: 10 },

  label: { color: MUTED, fontSize: 11, marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },
  readonlyBox: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#151515",
    justifyContent: "center",
  },
  readonlyText: { color: TEXT, fontSize: 12, fontWeight: "700" },

  rowBottom: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  meta: { flex: 1, minWidth: 0 },
  metaLabel: { color: MUTED, fontSize: 11 },
  metaValue: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 4 },
});
