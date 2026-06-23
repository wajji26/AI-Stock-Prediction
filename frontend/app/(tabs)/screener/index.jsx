import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchAllStocks } from "../../../data/stocks";
import { useAuth } from "../../../context/AuthContext";
import SkeletonLoader from "../../../components/SkeletonLoader";

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

const ALL = "All";
const SORTS = ["Name (A-Z)", "Top Gainers", "Top Losers", "Volume"];

const COL = {
  bg: "#0D0D0D",
  panel: "#141418",
  panel2: "#1A1A1A",
  border: "#23262d",
  text: "#e8eaed",
  sub: "#9aa0a6",
  dim: "#6b7280",
  gold: "#FFD700",
  green: "#16C784",
  red: "#EA3943",
};

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

function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <Pressable style={s.ddBtn} onPress={() => setOpen((o) => !o)}>
        <Text style={s.ddText} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color={COL.gold}
        />
      </Pressable>
      {open && (
        <View style={s.ddMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={s.ddItem}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  s.ddItemText,
                  opt === value && { color: COL.gold, fontWeight: "700" },
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

function RangeField({ label, minVal, maxVal, onMin, onMax, placeholder }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={{ flexDirection: "row" }}>
        <View style={[s.rangeBox, { marginRight: 6 }]}>
          <Text style={s.rangeHint}>Min</Text>
          <TextInput
            value={minVal}
            onChangeText={onMin}
            placeholder={placeholder?.min}
            placeholderTextColor={COL.dim}
            style={s.rangeInput}
            keyboardType="numeric"
          />
        </View>
        <View style={s.rangeBox}>
          <Text style={s.rangeHint}>Max</Text>
          <TextInput
            value={maxVal}
            onChangeText={onMax}
            placeholder={placeholder?.max}
            placeholderTextColor={COL.dim}
            style={s.rangeInput}
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );
}

export default function ScreenerScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState(ALL);
  const [sort, setSort] = useState("Name (A-Z)");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // applied filter state, only refreshes when Apply is pressed
  const [applied, setApplied] = useState({
    sector: ALL,
    sort: "Name (A-Z)",
    priceMin: "",
    priceMax: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await fetchAllStocks(token);
      if (alive) {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const onRefresh = useCallback(() => {
    if (!token) return;
    setRefreshing(true);
    fetchAllStocks(token)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {});
    setTimeout(() => setRefreshing(false), 2000);
  }, [token]);

  const sectorOptions = useMemo(() => {
    const set = new Set(rows.map((r) => sectorOf(r.symbol)));
    return [ALL, ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (applied.sector !== ALL) {
      list = list.filter((r) => sectorOf(r.symbol) === applied.sector);
    }

    const pMin = Number(applied.priceMin);
    const pMax = Number(applied.priceMax);
    if (Number.isFinite(pMin) && applied.priceMin !== "") {
      list = list.filter((r) => Number(r.price) >= pMin);
    }
    if (Number.isFinite(pMax) && applied.priceMax !== "") {
      list = list.filter((r) => Number(r.price) <= pMax);
    }

    if (search.trim()) {
      const t = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.symbol || "").toLowerCase().includes(t) ||
          (r.name || "").toLowerCase().includes(t),
      );
    }

    if (applied.sort === "Top Gainers") {
      list.sort(
        (a, b) =>
          (Number(b.changePercent) || 0) - (Number(a.changePercent) || 0),
      );
    } else if (applied.sort === "Top Losers") {
      list = list
        .filter((r) => (Number(r.changePercent) || 0) < 0)
        .sort(
          (a, b) =>
            (Number(a.changePercent) || 0) - (Number(b.changePercent) || 0),
        );
    } else if (applied.sort === "Volume") {
      list.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
    } else {
      list.sort((a, b) => (a.symbol || "").localeCompare(b.symbol || ""));
    }

    return list;
  }, [rows, applied, search]);

  const topGainers = useMemo(
    () =>
      [...rows]
        .filter((r) => Number(r.changePercent) > 0)
        .sort(
          (a, b) =>
            (Number(b.changePercent) || 0) - (Number(a.changePercent) || 0),
        )
        .slice(0, 3),
    [rows],
  );

  const topLosers = useMemo(
    () =>
      [...rows]
        .filter((r) => Number(r.changePercent) < 0)
        .sort(
          (a, b) =>
            (Number(a.changePercent) || 0) - (Number(b.changePercent) || 0),
        )
        .slice(0, 3),
    [rows],
  );

  const mostActive = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0))
        .slice(0, 3),
    [rows],
  );

  function applyFilters() {
    setApplied({ sector, sort, priceMin, priceMax });
  }
  function resetFilters() {
    setSector(ALL);
    setSort("Name (A-Z)");
    setPriceMin("");
    setPriceMax("");
    setApplied({
      sector: ALL,
      sort: "Name (A-Z)",
      priceMin: "",
      priceMax: "",
    });
  }

  return (
    <View style={s.screen}>
      <Text style={s.title}>Stock Screener</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      >
        {/* Toolbar */}
        <View style={s.toolbar}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={14} color={COL.sub} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search symbol or company"
              placeholderTextColor={COL.sub}
              style={s.searchInput}
            />
          </View>
          <View style={s.matchesPill}>
            <Text style={s.matchesText}>{filtered.length} MATCHES</Text>
          </View>
        </View>

        {/* Filters panel */}
        <View style={s.panel}>
          <Pressable
            style={s.panelHeader}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Text style={s.panelTitle}>Filters</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable onPress={resetFilters}>
                <Text style={s.resetAll}>Reset all</Text>
              </Pressable>
              <Ionicons
                name={showFilters ? "chevron-up" : "chevron-down"}
                size={16}
                color={COL.sub}
                style={{ marginLeft: 8 }}
              />
            </View>
          </Pressable>

          {showFilters && (
            <View style={{ padding: 12, paddingTop: 4 }}>
              <Dropdown
                label="Sector"
                value={sector}
                options={sectorOptions}
                onChange={setSector}
              />
              <Dropdown
                label="Sort By"
                value={sort}
                options={SORTS}
                onChange={setSort}
              />
              <RangeField
                label="Price (PKR)"
                minVal={priceMin}
                maxVal={priceMax}
                onMin={setPriceMin}
                onMax={setPriceMax}
                placeholder={{ min: "0", max: "Any" }}
              />

              <Pressable style={s.applyBtn} onPress={applyFilters}>
                <Text style={s.applyBtnText}>Apply Filters</Text>
              </Pressable>
              <Text style={s.applyHint}>{filtered.length} matches</Text>
            </View>
          )}
        </View>

        {/* Results */}
        <View style={[s.panel, { marginTop: 10 }]}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>Results</Text>
            <Text style={s.matchesText}>{filtered.length} MATCHES</Text>
          </View>

          {loading ? (
            <View style={{ padding: 12 }}>
              <SkeletonLoader />
            </View>
          ) : filtered.length === 0 ? (
            <Text style={s.empty}>No stocks match the current filters</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: 110 }]}>Symbol</Text>
                  <Text style={[s.th, { width: 110 }]}>Sector</Text>
                  <Text style={[s.th, { width: 80, textAlign: "right" }]}>
                    Last
                  </Text>
                  <Text style={[s.th, { width: 110, textAlign: "right" }]}>
                    Change
                  </Text>
                  <Text style={[s.th, { width: 80, textAlign: "right" }]}>
                    High
                  </Text>
                  <Text style={[s.th, { width: 80, textAlign: "right" }]}>
                    Low
                  </Text>
                  <Text style={[s.th, { width: 90, textAlign: "right" }]}>
                    Volume
                  </Text>
                </View>
                {filtered.map((r) => {
                  const pct = Number(r.changePercent) || 0;
                  const abs = Number(r.changeAbsolute) || 0;
                  const up = pct >= 0;
                  const cChg = up ? COL.green : COL.red;
                  return (
                    <View key={r.symbol} style={s.tr}>
                      <View
                        style={{
                          width: 110,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {r.logo ? (
                          <Image
                            source={{
                              uri: `https://img.logo.dev/${r.logo}?token=pk_P253PcFaTZepqM7o3SqeWw`,
                            }}
                            style={s.logo}
                          />
                        ) : (
                          <View style={[s.logo, { backgroundColor: COL.panel2 }]} />
                        )}
                        <Text style={s.tdSym} numberOfLines={1}>
                          {r.symbol}
                        </Text>
                      </View>
                      <Text
                        style={[s.td, { width: 110, color: COL.sub }]}
                        numberOfLines={1}
                      >
                        {sectorOf(r.symbol)}
                      </Text>
                      <Text style={[s.td, { width: 80, textAlign: "right" }]}>
                        {fmt(r.price)}
                      </Text>
                      <View style={{ width: 110, alignItems: "flex-end" }}>
                        <Text style={[s.td, { color: cChg }]}>
                          {up ? "+" : ""}
                          {abs.toFixed(2)}
                        </Text>
                        <Text style={[s.tdSmall, { color: cChg }]}>
                          {up ? "+" : ""}
                          {pct.toFixed(2)}%
                        </Text>
                      </View>
                      <Text style={[s.td, { width: 80, textAlign: "right" }]}>
                        {fmt(r.high)}
                      </Text>
                      <Text style={[s.td, { width: 80, textAlign: "right" }]}>
                        {fmt(r.low)}
                      </Text>
                      <Text style={[s.td, { width: 90, textAlign: "right" }]}>
                        {fmtVolume(r.volume)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Summary cards */}
        {!loading && rows.length > 0 && (
          <View style={s.summaryRow}>
            <View style={s.sumCard}>
              <Text style={s.sumTitle}>Top Gainers</Text>
              {topGainers.length === 0 ? (
                <Text style={s.sumEmpty}>—</Text>
              ) : (
                topGainers.map((g) => (
                  <View key={g.symbol} style={s.sumRow}>
                    <Text style={s.sumSym} numberOfLines={1}>
                      {g.symbol}
                    </Text>
                    <Text style={[s.sumChg, { color: COL.green }]}>
                      +{Number(g.changePercent).toFixed(2)}%
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={s.sumCard}>
              <Text style={s.sumTitle}>Top Losers</Text>
              {topLosers.length === 0 ? (
                <Text style={s.sumEmpty}>—</Text>
              ) : (
                topLosers.map((g) => (
                  <View key={g.symbol} style={s.sumRow}>
                    <Text style={s.sumSym} numberOfLines={1}>
                      {g.symbol}
                    </Text>
                    <Text style={[s.sumChg, { color: COL.red }]}>
                      {Number(g.changePercent).toFixed(2)}%
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={s.sumCard}>
              <Text style={s.sumTitle}>Most Active</Text>
              {mostActive.map((g) => (
                <View key={g.symbol} style={s.sumRow}>
                  <Text style={s.sumSym} numberOfLines={1}>
                    {g.symbol}
                  </Text>
                  <Text style={[s.sumChg, { color: COL.sub }]}>
                    {fmtVolume(g.volume)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COL.bg, paddingTop: 40 },

  title: {
    color: "#e8eaed",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginTop: 6,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COL.panel2,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: { flex: 1, color: COL.text, marginLeft: 6, fontSize: 12 },
  matchesPill: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COL.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COL.border,
  },
  matchesText: {
    color: COL.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  panel: {
    marginTop: 10,
    marginHorizontal: 14,
    backgroundColor: COL.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COL.border,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COL.border,
  },
  panelTitle: { color: COL.text, fontWeight: "800", fontSize: 13 },
  resetAll: { color: COL.gold, fontSize: 11, fontWeight: "700" },

  fieldLabel: {
    color: COL.sub,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  ddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COL.panel2,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 34,
    borderWidth: 1,
    borderColor: COL.border,
  },
  ddText: { color: COL.text, fontSize: 12, fontWeight: "600", flex: 1 },
  ddMenu: {
    backgroundColor: COL.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COL.border,
    marginTop: 4,
  },
  ddItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1f24",
  },
  ddItemText: { color: COL.text, fontSize: 12 },

  rangeBox: {
    flex: 1,
    backgroundColor: COL.panel2,
    borderWidth: 1,
    borderColor: COL.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rangeHint: { color: COL.dim, fontSize: 9, marginBottom: 2 },
  rangeInput: { color: COL.text, fontSize: 12, padding: 0, height: 18 },

  applyBtn: {
    height: 48,
    backgroundColor: COL.gold,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  applyBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  applyHint: {
    color: COL.gold,
    textAlign: "center",
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
  },

  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COL.border,
  },
  th: {
    color: COL.sub,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1f24",
  },
  td: { color: COL.text, fontSize: 12, paddingHorizontal: 4 },
  tdSmall: { fontSize: 10, paddingHorizontal: 4 },
  tdSym: { color: COL.text, fontSize: 12, fontWeight: "800" },
  logo: { width: 22, height: 22, borderRadius: 11, marginRight: 8 },

  empty: {
    color: COL.sub,
    textAlign: "center",
    paddingVertical: 30,
    fontSize: 13,
  },

  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 10,
  },
  sumCard: {
    flex: 1,
    backgroundColor: COL.panel,
    borderWidth: 1,
    borderColor: COL.border,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 3,
  },
  sumTitle: {
    color: COL.text,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 8,
  },
  sumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sumSym: { color: COL.text, fontWeight: "700", fontSize: 11, flex: 1 },
  sumChg: { fontSize: 11, fontWeight: "600" },
  sumEmpty: { color: COL.dim, fontSize: 11 },
});
