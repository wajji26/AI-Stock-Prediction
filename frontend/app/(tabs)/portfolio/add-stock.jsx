// app/add-stock.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createPosition } from "../../../data/portfolioApi";
import { fetchAllStocks } from "../../../data/stocks";
import { useAuth } from "../../../context/AuthContext";

export default function AddStockScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [allStocks, setAllStocks] = useState([]);
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);

  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchAllStocks();
      setAllStocks(data);
      if (data.length > 0) setSelected(data[0]);
    }
    load();
  }, []);

  const filteredStocks = useMemo(() => {
    if (!search.trim()) return allStocks;
    const q = search?.toLowerCase();
    return allStocks.filter(
      (s) => s?.symbol?.toLowerCase().includes(q),
      // ||
      //   s?.name?.toLowerCase().includes(q),
    );
  }, [allStocks, search]);

  const total = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const p = parseFloat(price) || 0;
    return q * p;
  }, [qty, price]);

  const isValid =
    selected && parseFloat(qty) > 0 && parseFloat(price) > 0 && !saving;

  function quickAdd(val) {
    const current = parseFloat(qty) || 0;
    setQty(String(current + val));
  }

  async function handleSubmit() {
    if (!isValid || !selected) return;
    setSaving(true);

    const payload = {
      // logo: selected.logo,
      symbol: selected.symbol,
      // companyName: selected.companyName,
      quantity: parseFloat(qty),
      buyPrice: parseFloat(price),
      currentPrice: selected.price,
    };

    // console.log("token:", token);

    try {
      const res = await createPosition(payload, token);
      if (res?.portfolio) {
        Alert.alert(
          "Added to portfolio",
          `${payload.quantity} x ${payload.symbol} @ ${payload.buyPrice}`,
          [{ text: "OK", onPress: () => router.push("/portfolio") }],
        );
      } else {
        Alert.alert("Error", "Could not save position (mock).");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong: ");
      console.log("Error: ", e);
    } finally {
      ``;
      setSaving(false);
    }
  }

  console.log(selected);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top bar */}
        <View className="header" style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#e8eaed" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Portfolio</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Search + select stock */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Stock</Text>
            <Text style={styles.cardSub}>
              Search and choose the stock you’re adding
            </Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="#9aa0a6" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setShowList(true);
                }}
                placeholder={
                  selected ? `${selected.symbol}` : "Search OGDC/PPL"
                }
                placeholderTextColor="#9aa0a6"
                onFocus={() => setShowList(true)}
              />
              <TouchableOpacity onPress={() => setShowList(!showList)}>
                <Ionicons
                  name={showList ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#9aa0a6"
                />
              </TouchableOpacity>
            </View>

            {showList && (
              <View style={styles.dropdown}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {filteredStocks.map((s) => (
                    <TouchableOpacity
                      key={s.symbol}
                      style={styles.stockRow}
                      onPress={() => {
                        setSelected(s);
                        setSearch("");
                        setShowList(false);
                      }}
                    >
                      <Text style={styles.stockMain}>
                        {s.symbol} • {s.companyName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {filteredStocks.length === 0 && (
                    <Text style={styles.empty}>No stocks found</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Order details (same as before) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stock Details</Text>
            <Text style={styles.cardSub}>
              Enter quantity and buy price per share
            </Text>

            {/* Quantity */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Quantity</Text>
              <View style={styles.fieldInputWrap}>
                <TextInput
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#555"
                  style={styles.fieldInput}
                />
              </View>
            </View>

            {/* Quick qty buttons */}
            <View style={styles.quickRow}>
              {[1, 5, 10].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={styles.quickBtn}
                  onPress={() => quickAdd(v)}
                >
                  <Text style={styles.quickBtnText}>+{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price */}
            <View style={[styles.fieldRow, { marginTop: 18 }]}>
              <Text style={styles.fieldLabel}>Buy Price (per share)</Text>
              <View style={styles.fieldInputWrap}>
                <Text style={styles.fieldPrefix}>Rs.</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#555"
                  style={[styles.fieldInput, { textAlign: "left" }]}
                />
              </View>
              <Text
                style={[styles.fieldPrefix, { marginLeft: 6, marginTop: 6 }]}
              >
                Current price: Rs.{selected?.price}
              </Text>

              <View>
                {allStocks?.map((s) => {
                  s.symbol === selected?.symbol && (
                    <Text style={styles.fieldPrefix}>
                      Current Price: Rs.{s?.price}
                    </Text>
                  );
                })}
              </View>
            </View>

            {/* Total */}
            <View className="totalRow" style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Estimated Cost</Text>
                <Text style={styles.totalHint}>Quantity × price per share</Text>
              </View>
              <Text style={styles.totalValue}>{total.toFixed(2)}.Rs</Text>
            </View>
          </View>

          {/* Info note */}
        </ScrollView>

        {/* Fixed confirm button */}
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && { opacity: 0.4 }]}
          disabled={!isValid}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>
            {saving ? "Adding..." : "Add to Portfolio"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
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
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  cardTitle: { color: "#e8eaed", fontWeight: "700", fontSize: 15 },
  cardSub: { color: "#9aa0a6", fontSize: 12, marginTop: 4 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginTop: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: "#e8eaed",
    marginLeft: 6,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    maxHeight: 240,
    paddingVertical: 4,
  },
  stockRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stockMain: { color: "#e8eaed", fontSize: 13 },
  empty: {
    color: "#9aa0a6",
    textAlign: "center",
    paddingVertical: 12,
  },

  fieldRow: {
    marginTop: 16,
  },
  fieldLabel: {
    color: "#e8eaed",
    fontSize: 13,
    marginBottom: 6,
  },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  fieldPrefix: { color: "#9aa0a6", fontSize: 14, marginRight: 4 },
  fieldInput: {
    flex: 1,
    color: "#e8eaed",
    fontSize: 14,
    textAlign: "right",
    paddingVertical: 10,
  },
  quickRow: { flexDirection: "row", marginTop: 10 },
  quickBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  quickBtnText: { color: "#e8eaed", fontSize: 12, fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
  },
  totalLabel: { color: "#9aa0a6", fontSize: 12 },
  totalHint: { color: "#666", fontSize: 11, marginTop: 2 },
  totalValue: { color: "#e8eaed", fontSize: 18, fontWeight: "700" },
  infoText: { color: "#9aa0a6", fontSize: 12 },
  submitBtn: {
    // position: "absolute",
    // left: 16,
    // right: 16,
    // bottom: 24,
    backgroundColor: "#FFD700",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginHorizontal: 16,
  },
  submitText: { color: "#141414", fontWeight: "700", fontSize: 15 },
});
