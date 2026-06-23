import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import IdeaCard from "../../../components/community/IdeaCard";
import NewIdeaModal from "../../../components/community/NewIdeaModal";
import { useAuth } from "../../../context/AuthContext";
import { fetchIdeas } from "../../../data/community";

const TABS = [
  { key: "popular", label: "Popular", sort: "popular", filter: "all" },
  { key: "editors", label: "Editors' picks", sort: "popular", filter: "editors" },
  { key: "recent", label: "Latest", sort: "recent", filter: "all" },
];

const CARD_WIDTH = Dimensions.get("window").width - 32;

export default function CommunityFeed() {
  const { token } = useAuth();
  const [tab, setTab] = useState("popular");
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(
    async (tabKey, isRefresh = false) => {
      const t = TABS.find((x) => x.key === tabKey) || TABS[0];
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const res = await fetchIdeas({ sort: t.sort, filter: t.filter, token });
        setIdeas(res.ideas || []);
      } catch (e) {
        setError("Couldn't load community ideas.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  // reload whenever the screen regains focus (e.g. after posting/boosting)
  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [tab, load]),
  );

  const onTab = (key) => {
    setTab(key);
    load(key);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(tab, true);
  };

  const onCreatePress = () => {
    if (!token) {
      router.push("/profile");
      return;
    }
    setShowNew(true);
  };

  const header = (
    <View>
      <Text style={styles.bigTitle}>Community ideas</Text>
      <View style={styles.pills}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => onTab(t.key)}
            style={[styles.pill, tab === t.key && styles.pillOn]}
          >
            <Text style={[styles.pillTxt, tab === t.key && styles.pillTxtOn]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      {loading ? (
        <ActivityIndicator color="#FFD700" />
      ) : error ? (
        <Text style={styles.emptyTxt}>{error}</Text>
      ) : (
        <>
          <Ionicons name="bulb-outline" size={40} color="#333" />
          <Text style={styles.emptyTxt}>
            {tab === "editors"
              ? "No editors' picks yet."
              : "No ideas yet. Be the first to share one!"}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Community</Text>
      </View>

      <FlatList
        data={ideas}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <IdeaCard
            idea={item}
            cardWidth={CARD_WIDTH}
            onAuthRequired={() => router.push("/profile")}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={onCreatePress}>
        <Ionicons name="add" size={28} color="#0D0D0D" />
      </TouchableOpacity>

      <NewIdeaModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => {
          setShowNew(false);
          setTab("recent");
          load("recent");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 60 },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 6,
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
  topTitle: { color: "#e8eaed", fontSize: 20, fontWeight: "700" },
  bigTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  pills: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#141414",
  },
  pillOn: { backgroundColor: "#FFD700" },
  pillTxt: { color: "#9aa0a6", fontSize: 13, fontWeight: "600" },
  pillTxtOn: { color: "#0D0D0D", fontWeight: "700" },
  empty: { paddingTop: 60, alignItems: "center", gap: 12 },
  emptyTxt: { color: "#6b7280", fontSize: 13, textAlign: "center" },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
