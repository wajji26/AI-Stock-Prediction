import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { API_URL } from "../../../config/config";
// import { LinearGradient } from "expo-linear-gradient";
import PortfolioPredictionGraph from "../../../components/PortfolioPredictionGraph";
import PortfolioSummaryCard from "../../../components/PortfolioSummaryCard";
import PositionRow from "../../../components/PositionRow";
import SkeletonLoader from "../../../components/SkeletonLoader";
import { fetchPortfolio } from "../../../data/portfolio";
import { useAuth } from "../../../context/AuthContext";
import { useData } from "../../../context/DataContext";

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();
  const { token } = useAuth();
  const { setApiData } = useData();

  const fetchPortfolioPredictions = async () => {
    try {
      setPredictionsLoading(true);

      const response = await fetch(`${API_URL}/api/portfolio/prediction`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setPortfolioData(data);
    } catch (error) {
      console.error("Error fetching portfolio predictions:", error);
    } finally {
      setPredictionsLoading(false);
    }
  };

  async function load() {
    try {
      setLoading(true);
      const data = await fetchPortfolio(token);
      setPortfolio(data);
      setApiData(data.positions);
      // console.log(data.positions);
    } finally {
      setLoading(false);
    }
  }
  // console.log(portfolio.distribution.length);

  useFocusEffect(
    useCallback(() => {
      load();
      fetchPortfolioPredictions();
    }, [token]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.allSettled([load(), fetchPortfolioPredictions()]);
    setTimeout(() => setRefreshing(false), 2000);
  }, [token]);

  function getColorFromSymbol(symbol) {
    let hash = 0;

    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).slice(-2);
    }

    return color;
  }

  const pieData = (portfolio?.distribution ?? []).map((d) => ({
    value: d.value,
    color: getColorFromSymbol(d.symbol),
    text: d.symbol,
  }));

  // console.log(portfolio);

  if (portfolio === null) {
    return <SkeletonLoader />;
  }

  if (!portfolio?.positions?.length) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Your portfolio is empty</Text>
        <Text style={styles.emptyText}>
          Add your first holding to track performance and see AI forecasts.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          activeOpacity={0.85}
          onPress={() => router.push("/portfolio/add-stock")}
        >
          <Ionicons name="add" size={20} color="#141414" />
          <Text style={styles.emptyButtonText}>Add Portfolio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      >
        <Text style={styles.title}>Portfolio</Text>

        {loading ? (
          <SkeletonLoader />
        ) : (
          <>
            {/* Summary card */}
            <PortfolioSummaryCard summary={portfolio.summary} />

            {/* Pie chart section (placeholder for real chart lib) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Asset Allocation</Text>
              <Text style={styles.cardSub}>Distribution by current value</Text>
              <View style={styles.pieWrap}>
                {portfolio?.distribution?.length > 0 && (
                  <PieChart
                    data={pieData}
                    radius={60}
                    innerRadius={40}
                    innerCircleColor="#141414"
                    donut
                    showText={false}
                  />
                )}

                <View style={{ marginLeft: 16, flex: 1 }}>
                  {portfolio.distribution.map((d) => (
                    <View
                      key={d.symbol}
                      style={{ flexDirection: "row", marginBottom: 6 }}
                    >
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: getColorFromSymbol(d.symbol) },
                        ]}
                      />
                      <Text style={styles.legendText}>
                        {d.symbol} • Rs.{d.value.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* AI predictions card (fake line chart box for now) */}
            <View style={styles.card}>
              {/* Your other components */}

              <PortfolioPredictionGraph
                portfolioData={portfolioData}
                loading={predictionsLoading}
              />
            </View>

            {/* Positions list */}
            <View style={[styles.card, { paddingHorizontal: 0 }]}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingHorizontal: 16,
                }}
              >
                <View style={{ paddingBottom: 8 }}>
                  <Text style={styles.cardTitle}>Holdings</Text>
                  <Text style={styles.cardSub}>
                    Quantity, average buy price, and performance
                  </Text>
                </View>
                <Pressable onPress={() => router.push("/portfolio/stock-edit")}>
                  <Ionicons
                    style={{ marginBottom: 30 }}
                    name="create-outline"
                    size={25}
                    color="#FFD700"
                  />
                </Pressable>
              </View>
              {portfolio.positions.map((pos) => (
                <PositionRow key={pos.symbol} pos={pos} />
              ))}
              <Text
                onPress={() => router.push("/portfolio/stock-edit")}
                style={styles.more}
              >
                Edit Portfolio
                <Ionicons name="chevron-forward" size={12} color="#FFD700" />
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Fixed Add Stock button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/portfolio/add-stock")} // page to build next
      >
        <Ionicons name="add" size={22} color="#141414" />
        <Text style={styles.fabText}>Add Portfolio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 40 },
  title: {
    color: "#e8eaed",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loading: { color: "#e8eaed", paddingHorizontal: 16, marginTop: 16 },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 6,
    marginTop: 16,
    padding: 16,
  },
  cardTitle: { color: "#e8eaed", fontWeight: "700", fontSize: 15 },
  cardSub: { color: "#9aa0a6", fontSize: 12, marginTop: 4 },
  pieWrap: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  pieCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1F1F1F",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
    marginTop: 4,
    marginRight: 6,
  },
  legendText: { color: "#e8eaed", fontSize: 12 },
  chartBox: {
    marginTop: 16,
    height: 140,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
  },
  hint: { color: "#9aa0a6", fontSize: 11, marginTop: 8 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 20, // above tab bar
    backgroundColor: "#FFD700",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  fabText: {
    color: "#141414",
    fontWeight: "700",
    marginLeft: 6,
  },
  emptyScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#070707",
  },
  emptyIllustration: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255, 215, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#E8EAED",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#A9A9A9",
    fontWeight: "400",
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: "#141414",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 14,
  },
  more: { color: "#FFD700", alignSelf: "center", marginVertical: 12 },
});
