import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";

import SegmentTabs from "../../components/SegmentTabs";
import SmartSummaryCard from "../../components/ai/SmartSummaryCard";
import AITopPicks from "../../components/ai/AITopPicks";
import MarketSentimentCard from "../../components/ai/MarketSentimentCard";
import RiskAnalysisCard from "../../components/ai/RiskAnalysisCard";
import AIInsightsFeed from "../../components/ai/AIInsightsFeed";

import { loadAIInsights } from "../../data/aiInsights";
import { useAuth } from "../../context/AuthContext";

const TABS = ["Overview", "Signals", "Performance", "News Impact"];

function updatedLabel(ts) {
  if (!ts) return "";
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  return `Updated ${mins} min ago`;
}

export default function AIInsights() {
  const { token } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await loadAIInsights(token);
      setData(result);
    } catch (err) {
      console.error("AI insights load failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 2000);
  };

  const SentimentRiskRow = () =>
    data ? (
      <View style={styles.row}>
        <MarketSentimentCard sentiment={data.sentiment} />
        <RiskAnalysisCard risk={data.risk} />
      </View>
    ) : null;

  const renderTab = () => {
    if (!data) return null;
    const upd = updatedLabel(data.updatedAt);
    switch (tab) {
      case "Signals":
        return (
          <>
            <AITopPicks picks={data.topPicks} updatedLabel={upd} />
            <AIInsightsFeed
              feed={data.feed.filter((f) => f.tag !== "News Impact")}
            />
          </>
        );
      case "Performance":
        return (
          <>
            <SmartSummaryCard summary={data.summary} />
            <SentimentRiskRow />
          </>
        );
      case "News Impact":
        return (
          <AIInsightsFeed
            feed={data.feed.filter((f) => f.tag === "News Impact")}
          />
        );
      case "Overview":
      default:
        return (
          <>
            <SmartSummaryCard summary={data.summary} />
            <AITopPicks picks={data.topPicks} updatedLabel={upd} />
            <SentimentRiskRow />
            <AIInsightsFeed feed={data.feed} />
          </>
        );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <Text style={styles.title}>AI Insights</Text>

      <SegmentTabs tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFD700" size="large" />
          <Text style={styles.loadingTxt}>Analyzing the market…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
            />
          }
        >
          {renderTab()}
        </ScrollView>
      )}
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
  row: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 16 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { color: "#9aa0a6", marginTop: 12, fontSize: 13 },
});
