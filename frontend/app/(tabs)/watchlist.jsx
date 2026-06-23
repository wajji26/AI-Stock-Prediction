import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import StockRow from "../../components/StockRow";
import { useAuth } from "../../context/AuthContext";
import SkeletonLoader from "../../components/SkeletonLoader";
import { API_URL } from "../../config/config";

export default function StocksScreen() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { token } = useAuth();

  const fetchWatchlist = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/users/get-watchlist`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log("Failed to fetch watchlist:", errorText);
        return;
      }

      const data = await res.json();
      setRows(data.watchlist);
    } catch (err) {
      console.log("Error fetching watchlist:", err);
    }
  }, [token]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchWatchlist().finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [fetchWatchlist]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWatchlist();
    setTimeout(() => setRefreshing(false), 2000);
  }, [fetchWatchlist]);
  return (
    <View style={styles.screen}>
      {/* Search bar + icons */}
      <View style={styles.header}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color="#9aa0a6" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search AAPL/TSLA"
            placeholderTextColor="#9aa0a6"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.headRow}>
        <Text style={[styles.hcell, { flex: 1.3 }]}>Trading Pairs / Vol •</Text>
        <Text style={[styles.hcell, { flex: 1 }]}>Price •</Text>
        <Text style={[styles.hcell, { width: 100, textAlign: "right" }]}>
          24H Change •
        </Text>
      </View>

      <ScrollView
        style={styles.listCard}
        contentContainerStyle={{ paddingVertical: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      >
        {loading ? (
          <SkeletonLoader />
        ) : (
          rows
            .filter((s) => s && s.symbol && typeof s.price === "number")
            .map((s) => (
              <StockRow
                key={s.symbol}
                logo={s.logo}
                name={s.name || s.symbol}
                ticker={s.symbol}
                price={s.price.toLocaleString()}
                changePercent={s.changePercent}
              />
            ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 36,
  },
  input: { flex: 1, color: "#fff", marginLeft: 6 },
  headRow: { flexDirection: "row", paddingHorizontal: 16, marginTop: 14 },
  hcell: { color: "#9aa0a6", fontSize: 12 },
  listCard: { backgroundColor: "transparent", marginTop: 4 },
  loading: { color: "#e8eaed", paddingHorizontal: 16, paddingVertical: 20 },
});
