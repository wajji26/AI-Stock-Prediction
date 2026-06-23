import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import StockListRow from "../../../components/StockListRow";
import SkeletonLoader from "../../../components/SkeletonLoader";
import { fetchStocks } from "../../../data/stocks";
import { useAuth } from "../../../context/AuthContext";

// Sectors are intentionally broad so each bucket holds at least five stocks.
const SECTOR_BY_SYMBOL = {
  // Oil & Gas (6)
  MARI: "Oil & Gas", OGDC: "Oil & Gas", PPL: "Oil & Gas", POL: "Oil & Gas",
  PSO: "Oil & Gas", CNERGY: "Oil & Gas",
  // Energy & Utilities (6)
  ATRL: "Energy & Utilities", NRL: "Energy & Utilities", PRL: "Energy & Utilities",
  HUBC: "Energy & Utilities", SNGP: "Energy & Utilities", SSGC: "Energy & Utilities",
  // Banking & Tech (6)
  MEBL: "Banking & Tech", HBL: "Banking & Tech", UBL: "Banking & Tech",
  MCB: "Banking & Tech", SYS: "Banking & Tech", AIRLINK: "Banking & Tech",
  // Cement & Industrials (7)
  DGKC: "Cement & Industrials", FCCL: "Cement & Industrials", LUCK: "Cement & Industrials",
  MLCF: "Cement & Industrials", ISL: "Cement & Industrials", PAEL: "Cement & Industrials",
  SAZEW: "Cement & Industrials",
  // Pharma & Chemicals (7)
  CPHL: "Pharma & Chemicals", GHNI: "Pharma & Chemicals", GLAXO: "Pharma & Chemicals",
  SEARL: "Pharma & Chemicals", EFERT: "Pharma & Chemicals", FFL: "Pharma & Chemicals",
  FFC: "Pharma & Chemicals",
};
const sectorOf = (sym) => SECTOR_BY_SYMBOL[sym] || "Other";

const ALL_SECTORS_LABEL = "All Sectors";
const SORTS = ["Name (A-Z)", "Top Gainers", "Top Losers", "Volume"];

function FilterChip({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Pressable style={styles.chip} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.chipText} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color="#F0B90B"
        />
      </Pressable>
      {open && (
        <View style={styles.menu}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={styles.menuItem}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.menuText,
                  opt === value && { color: "#F0B90B", fontWeight: "700" },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function StocksScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState(ALL_SECTORS_LABEL);
  const [sort, setSort] = useState("Name (A-Z)");

  const { token } = useAuth();

  async function load({ force = false } = {}) {
    setLoading(true);
    const data = await fetchStocks({ topTab: "All", q: "", token, force });
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStocks({ topTab: "All", q: "", token, force: true })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {});
    setTimeout(() => setRefreshing(false), 2000);
  }, [token]);

  const sectorOptions = useMemo(() => {
    const set = new Set(rows.map((s) => sectorOf(s.symbol)));
    return [ALL_SECTORS_LABEL, ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (sector !== ALL_SECTORS_LABEL) {
      list = list.filter((s) => sectorOf(s.symbol) === sector);
    }

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((s) =>
        ((s.symbol || "") + " " + (s.name || "")).toLowerCase().includes(t),
      );
    }

    if (sort === "Top Gainers") {
      list.sort(
        (a, b) => (Number(b.changePercent) || 0) - (Number(a.changePercent) || 0),
      );
    } else if (sort === "Top Losers") {
      list = list
        .filter((s) => (Number(s.changePercent) || 0) < 0)
        .sort(
          (a, b) =>
            (Number(a.changePercent) || 0) - (Number(b.changePercent) || 0),
        );
    } else if (sort === "Volume") {
      list.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
    } else {
      list.sort((a, b) => (a.symbol || "").localeCompare(b.symbol || ""));
    }
    return list;
  }, [rows, q, sector, sort]);

  return (
    <View style={styles.screen}>
      {/* Search bar */}
      <View style={styles.search}>
        <Ionicons name="search" size={16} color="#9aa0a6" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search stocks…"
          placeholderTextColor="#9aa0a6"
          style={styles.input}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        <FilterChip
          value={sector}
          options={sectorOptions}
          onChange={setSector}
        />
        <View style={{ width: 8 }} />
        <FilterChip value={sort} options={SORTS} onChange={setSort} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
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
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No stocks found</Text>
        ) : (
          filtered.map((s) => <StockListRow key={s.symbol} stock={s} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 40 },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  brand: {
    color: "#e8eaed",
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  iconBtn: { marginLeft: 14 },

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#141418",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#23262d",
  },
  statusOpen: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  indexLabel: { color: "#e8eaed", fontSize: 12, fontWeight: "700" },
  indexPct: { fontSize: 12, fontWeight: "700" },
  dateText: { color: "#9aa0a6", fontSize: 11 },

  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 36,
    marginHorizontal: 14,
    marginTop: 10,
  },
  input: { flex: 1, color: "#fff", marginLeft: 6 },

  filters: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    zIndex: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 32,
  },
  chipText: { color: "#e8eaed", fontSize: 12, fontWeight: "600", flex: 1 },
  menu: {
    position: "absolute",
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: "#141418",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#23262d",
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1f24",
  },
  menuText: { color: "#e8eaed", fontSize: 12 },

  empty: {
    color: "#9aa0a6",
    textAlign: "center",
    paddingVertical: 40,
    fontSize: 13,
  },
});
