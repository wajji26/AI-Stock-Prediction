import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchDividends,
  fetchEarnings,
  fetchListings,
} from "../../data/calendar";

/* ------------------------------ date helpers ------------------------------ */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
// Monday as the first day of the week
function startOfWeek(d) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7; // 0 = Monday
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
// Parse PSX "June 18, 2026 3:52 PM" -> "2026-06-18" (Hermes-safe, no Date.parse)
function parseLongDateYmd(str) {
  if (!str) return null;
  const m = str.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const mi = MONTHS_LONG.findIndex(
    (x) => x.toLowerCase() === m[1].toLowerCase(),
  );
  if (mi < 0) return null;
  return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
}

/* --------------------------------- screen --------------------------------- */
const TABS = [
  { key: "earnings", label: "Earnings" },
  { key: "dividends", label: "Dividends" },
  { key: "listings", label: "Listings" },
];

export default function CalendarScreen() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [tab, setTab] = useState("earnings");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [query, setQuery] = useState("");

  const [earnings, setEarnings] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [listings, setListings] = useState([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = weekDays[6];

  // Earnings: fetch a wide window once, then filter by week client-side.
  const loadEarnings = useCallback(async (from, to) => {
    setLoadingWeek(true);
    setError(null);
    try {
      const res = await fetchEarnings(from, to);
      setEarnings(res.events || []);
    } catch (e) {
      setError("Couldn't load PSX calendar. Pull to retry.");
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  // Initial load: earnings (3-month window), dividends, listings.
  useEffect(() => {
    const from = ymd(addDays(weekStart, -45));
    const to = ymd(addDays(weekStart, 60));
    loadEarnings(from, to);
    (async () => {
      try {
        const [dv, ls] = await Promise.all([
          fetchDividends(),
          fetchListings(),
        ]);
        setDividends(dv.dividends || []);
        setListings(ls.listings || []);
      } catch {
        /* earnings error already surfaces; dividends/listings stay empty */
      } finally {
        setLoadedOnce(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch earnings when the visible week moves outside the loaded window.
  const onWeekChange = useCallback(
    (newStart) => {
      setWeekStart(newStart);
      const from = ymd(addDays(newStart, -45));
      const to = ymd(addDays(newStart, 60));
      loadEarnings(from, to);
    },
    [loadEarnings],
  );

  const goToday = () => {
    const ws = startOfWeek(new Date());
    setSelectedDay(today);
    if (ymd(ws) !== ymd(weekStart)) onWeekChange(ws);
  };
  const prevWeek = () => {
    const ns = addDays(weekStart, -7);
    onWeekChange(ns);
    setSelectedDay(ns);
  };
  const nextWeek = () => {
    const ns = addDays(weekStart, 7);
    onWeekChange(ns);
    setSelectedDay(ns);
  };

  /* ---------------------- per-day counts for the strip ---------------------- */
  const earningsByDay = useMemo(() => {
    const map = {};
    for (const e of earnings) {
      (map[e.date] = map[e.date] || []).push(e);
    }
    return map;
  }, [earnings]);

  const dividendsByDay = useMemo(() => {
    const map = {};
    for (const d of dividends) {
      const key = parseLongDateYmd(d.announcedAt);
      if (!key) continue;
      (map[key] = map[key] || []).push(d);
    }
    return map;
  }, [dividends]);

  /* ----------------------------- filtered rows ------------------------------ */
  const selKey = ymd(selectedDay);
  const rows = useMemo(() => {
    if (tab === "earnings") return earningsByDay[selKey] || [];
    if (tab === "dividends") return dividendsByDay[selKey] || [];
    // listings: full list, optionally filtered by search
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.symbol.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q),
    );
  }, [tab, selKey, earningsByDay, dividendsByDay, listings, query]);

  const rangeLabel = `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} — ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  const sectionTitle =
    tab === "listings"
      ? `PSX Listed Companies${query ? "" : ` (${listings.length})`}`
      : `${WEEKDAYS_LONG[(selectedDay.getDay() + 6) % 7]}, ${MONTHS_LONG[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`;

  /* -------------------------------- header --------------------------------- */
  const ListHeader = (
    <View>
      {/* date nav */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.todayBtn} onPress={goToday}>
          <Text style={styles.todayTxt}>Today</Text>
        </TouchableOpacity>
        <View style={styles.navArrows}>
          <TouchableOpacity onPress={prevWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={18} color="#e8eaed" />
          </TouchableOpacity>
          <Text style={styles.rangeTxt}>{rangeLabel}</Text>
          <TouchableOpacity onPress={nextWeek} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={18} color="#e8eaed" />
          </TouchableOpacity>
        </View>
        {loadingWeek ? (
          <ActivityIndicator size="small" color="#FFD700" />
        ) : (
          <View style={{ width: 18 }} />
        )}
      </View>

      {/* week day strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {weekDays.map((d) => {
          const key = ymd(d);
          const isSel = key === selKey;
          const isToday = key === ymd(today);
          const eCount = (earningsByDay[key] || []).length;
          const dCount = (dividendsByDay[key] || []).length;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedDay(new Date(d))}
              style={[styles.dayCard, isSel && styles.dayCardSel]}
            >
              <Text style={[styles.dayName, isToday && styles.todayAccent]}>
                {WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()}
              </Text>
              <View style={styles.dayCounts}>
                <View style={styles.countRow}>
                  <Text style={styles.countLabel}>Earnings</Text>
                  <Text style={styles.countVal}>{eCount}</Text>
                </View>
                <View style={styles.countRow}>
                  <Text style={styles.countLabel}>Dividends</Text>
                  <Text style={styles.countVal}>{dCount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text
              style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* search (listings only) */}
      {tab === "listings" && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#9aa0a6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search symbol or company"
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* section title */}
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
    </View>
  );

  /* --------------------------------- rows ---------------------------------- */
  const renderItem = ({ item }) => {
    if (tab === "earnings") return <EarningsRow e={item} />;
    if (tab === "dividends") return <DividendRow d={item} />;
    return <ListingRow l={item} />;
  };

  const keyExtractor = (item, i) =>
    tab === "earnings"
      ? String(item.id)
      : `${item.symbol}-${i}`;

  const empty = (
    <View style={styles.empty}>
      {error ? (
        <Text style={styles.emptyTxt}>{error}</Text>
      ) : !loadedOnce || loadingWeek ? (
        <ActivityIndicator color="#FFD700" />
      ) : (
        <Text style={styles.emptyTxt}>
          {tab === "listings"
            ? "No companies match your search."
            : `No ${tab === "earnings" ? "meetings" : "dividend announcements"} on this day.`}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        removeClippedSubviews
      />
    </View>
  );
}

/* -------------------------------- row views ------------------------------- */
function Monogram({ symbol }) {
  return (
    <View style={styles.monogram}>
      <Text style={styles.monogramTxt}>{(symbol || "?").slice(0, 2)}</Text>
    </View>
  );
}

function EarningsRow({ e }) {
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{e.time || "—"}</Text>
      <Monogram symbol={e.symbol} />
      <View style={styles.rowMid}>
        <Text style={styles.symbol}>{e.symbol}</Text>
        <Text style={styles.company} numberOfLines={1}>
          {e.company}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>{e.type}</Text>
        </View>
        {e.periodEnd ? (
          <Text style={styles.sub}>Period {e.periodEnd}</Text>
        ) : null}
      </View>
    </View>
  );
}

function DividendRow({ d }) {
  return (
    <View style={styles.row}>
      <Monogram symbol={d.symbol} />
      <View style={styles.rowMid}>
        <Text style={styles.symbol}>{d.symbol}</Text>
        <Text style={styles.company} numberOfLines={1}>
          {d.company}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.chip, styles.chipGreen]}>
          <Text style={[styles.chipTxt, styles.chipTxtGreen]}>{d.payout}</Text>
        </View>
        {d.bookClosure ? (
          <Text style={styles.sub} numberOfLines={1}>
            Book: {d.bookClosure}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ListingRow({ l }) {
  return (
    <View style={styles.row}>
      <Monogram symbol={l.symbol} />
      <View style={styles.rowMid}>
        <Text style={styles.symbol}>{l.symbol}</Text>
        <Text style={styles.company} numberOfLines={1}>
          {l.company}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {l.sector}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.symbol}>{l.shares}</Text>
        <Text style={styles.sub}>shares</Text>
      </View>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: { color: "#e8eaed", fontSize: 20, fontWeight: "700" },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  todayBtn: {
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  todayTxt: { color: "#e8eaed", fontSize: 12, fontWeight: "600" },
  navArrows: { flexDirection: "row", alignItems: "center" },
  arrowBtn: { padding: 4 },
  rangeTxt: {
    color: "#e8eaed",
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 6,
  },

  strip: { paddingHorizontal: 12, gap: 8 },
  dayCard: {
    width: 130,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 12,
    marginRight: 8,
  },
  dayCardSel: { borderColor: "#FFD700" },
  dayName: { color: "#e8eaed", fontWeight: "700", marginBottom: 8 },
  todayAccent: { color: "#FFD700" },
  dayCounts: { gap: 4 },
  countRow: { flexDirection: "row", justifyContent: "space-between" },
  countLabel: { color: "#9aa0a6", fontSize: 11 },
  countVal: { color: "#e8eaed", fontSize: 11, fontWeight: "600" },

  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#141414",
  },
  tabActive: { backgroundColor: "#FFD700" },
  tabTxt: { color: "#9aa0a6", fontSize: 13, fontWeight: "600" },
  tabTxtActive: { color: "#0D0D0D", fontWeight: "700" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  searchInput: { flex: 1, color: "#e8eaed", paddingVertical: 9, fontSize: 13 },

  sectionTitle: {
    color: "#e8eaed",
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
    paddingLeft: 13,
    marginLeft: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#161616",
    gap: 10,
  },
  time: { color: "#9aa0a6", fontSize: 12, width: 40 },
  monogram: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  monogramTxt: { color: "#FFD700", fontSize: 12, fontWeight: "700" },
  rowMid: { flex: 1 },
  symbol: { color: "#e8eaed", fontSize: 14, fontWeight: "700" },
  company: { color: "#9aa0a6", fontSize: 12, marginTop: 1 },
  sub: { color: "#6b7280", fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: "flex-end", maxWidth: 140 },
  chip: {
    backgroundColor: "#1f1f1f",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipTxt: { color: "#e8eaed", fontSize: 11, fontWeight: "700" },
  chipGreen: { backgroundColor: "rgba(34,197,94,0.15)" },
  chipTxtGreen: { color: "#22c55e" },

  empty: { padding: 30, alignItems: "center" },
  emptyTxt: { color: "#6b7280", fontSize: 13, textAlign: "center" },
});
