import React, { useCallback, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../config/config";
import Loader from "../../../components/Loader";
import StockCandleChart from "../../../components/StockCandleChart";
import PredictiveGraph from "../../../components/PredictiveGraph";
import TechnicalIndicators from "../../../components/TechnicalIndicators";
import StockAISignal from "../../../components/ai/StockAISignal";
import StockSmartSummaryCard from "../../../components/ai/StockSmartSummaryCard";
import StockRiskCard from "../../../components/ai/StockRiskCard";
import MarketSentimentCard from "../../../components/ai/MarketSentimentCard";
import AIInsightsFeed from "../../../components/ai/AIInsightsFeed";
import { loadStockAIInsights } from "../../../data/stockAIInsights";

const TIME_RANGES = ["1M", "6M", "1Y", "ALL"];

const RANGE_MAPPING = {
  "1D": { range: "1d", interval: "15m" },
  "5D": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" }, // ← Add the 'd'
  "6M": { range: "6mo", interval: "1d" }, // ← Add the 'd'
  "1Y": { range: "1y", interval: "1d" }, // ← Add the 'd'
  ALL: { range: "max", interval: "1d" },
};

export default function StockDetailScreen() {
  const router = useRouter();
  const { symbol } = useLocalSearchParams();
  const { token } = useAuth();

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState("6M");

  const [watchlist, setWatchlist] = useState([]);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const [chart, setChart] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const [predictions, setPredictions] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState(null);
  const [predictionsWarming, setPredictionsWarming] = useState(false);
  const [predictionsRetry, setPredictionsRetry] = useState(0);

  const [aiInsights, setAiInsights] = useState(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

  const [howWePredictOpen, setHowWePredictOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Chart Fetch
  useEffect(() => {
    if (!symbol || !token) return;

    const fetchChart = async () => {
      try {
        setChartLoading(true);

        const { range, interval } = RANGE_MAPPING[selectedRange];
        const res = await fetch(
          `${API_URL}/api/stocks/psx/${symbol}/history?range=${range}&interval=${interval}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const data = await res.json();
        setChart(data);
      } catch (e) {
        console.log("Chart error:", e);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChart();
  }, [symbol, token, selectedRange, refreshTick]);

  //Single Stock Fetch
  useEffect(() => {
    if (!symbol || !token) return;

    const fetchStock = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/stocks/psx/${symbol}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status ${res.status}: ${text}`);
        }

        const data = await res.json();
        // Expecting shape:
        // { symbol, currentPrice, open, high, low, prevClose, change, percentChange }
        setStock(data);
        console.log(data);
      } catch (err) {
        console.log("Stock fetch error:", err);
        setError("Failed to load stock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [symbol, token, refreshTick]);

  // console.log(stock);

  //Watchlist
  useEffect(() => {
    // On mount, check if stock is in watchlist
    const checkWatchlist = async () => {
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
        setWatchlist(data.watchlist);

        const isWatchlisted = data.watchlist.some(
          (item) => item.symbol === symbol,
        );
        setIsInWatchlist(isWatchlisted);

        console.log(isWatchlisted);
      } catch (err) {
        console.log("Error checking watchlist:", err);
      }
    };

    if (token && symbol) checkWatchlist();
  }, [token, symbol, refreshTick]);

  //Predictions
  // The model server runs on Render free tier and sleeps after ~15 min of
  // inactivity. The first request after a sleep cold-starts TensorFlow and
  // can exceed the Node backend's 90s upstream timeout, producing a 502.
  // We retry the request once after a short pause, by then the service
  // is warm and the second attempt succeeds.
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    const MAX_ATTEMPTS = 3;
    const sleep = (ms) =>
      new Promise((r) => {
        const t = setTimeout(r, ms);
        return t;
      });

    const fetchOnce = async () => {
      const res = await fetch(
        `${API_URL}/predict/${symbol}?days=10&modelType=lstm`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = new Error(`HTTP ${res.status}: ${body || res.statusText}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    };

    const run = async () => {
      setPredictionsLoading(true);
      setPredictionsError(null);
      setPredictionsWarming(false);

      let lastErr = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const data = await fetchOnce();
          if (cancelled) return;
          setPredictions(data);
          setPredictionsError(null);
          setPredictionsWarming(false);
          setPredictionsLoading(false);
          return;
        } catch (err) {
          lastErr = err;
          // 502/503/504 + network errors are typical of the Python service
          // cold-starting on Render, retry. Other statuses (400/404/500
          // from a real model error) are not worth retrying.
          const retryable =
            err.status == null ||
            err.status === 502 ||
            err.status === 503 ||
            err.status === 504;
          if (!retryable || attempt === MAX_ATTEMPTS) break;
          if (!cancelled) setPredictionsWarming(true);
          // 6s, then 14s, gives the model server time to load TensorFlow.
          await sleep(attempt === 1 ? 6000 : 14000);
        }
      }

      if (cancelled) return;
      console.error("Prediction fetch error:", lastErr);
      setPredictions(null);
      setPredictionsError(
        lastErr?.status === 502 || lastErr?.status === 503 || lastErr?.status === 504
          ? "Prediction service is waking up. Please try again in a moment."
          : lastErr?.message?.includes("404") ||
              lastErr?.message?.includes("missing")
            ? `No trained model is available for ${symbol} yet.`
            : "Couldn't load AI predictions right now.",
      );
      setPredictionsWarming(false);
      setPredictionsLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [symbol, refreshTick, predictionsRetry]);

  // AI Insights (stock-specific): loads once we have the live quote so we can
  // build the smart summary, market sentiment, risk panel, and feed.
  useEffect(() => {
    if (!stock || !token) return;
    let cancelled = false;

    const predictionArray = Array.isArray(predictions)
      ? predictions
      : predictions?.predictions || [];
    const last = predictionArray[predictionArray.length - 1];
    const current = Number(stock?.price ?? stock?.open ?? stock?.close);
    const future = last ? Number(last.price) : NaN;
    const predictChange =
      Number.isFinite(current) && current > 0 && Number.isFinite(future)
        ? (future / current - 1) * 100
        : null;

    (async () => {
      try {
        setAiInsightsLoading(true);
        const result = await loadStockAIInsights({
          token,
          stock,
          predictions,
          predictChange,
        });
        if (!cancelled) setAiInsights(result);
      } catch (e) {
        console.log("Stock AI insights error:", e);
      } finally {
        if (!cancelled) setAiInsightsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stock, predictions, token]);

  console.log(predictions);

  // const predictions = [
  //   {
  //     date: "2025-12-24",
  //     price: 274.1451110839844,
  //   },
  //   {
  //     date: "2025-12-25",
  //     price: 273.7609558105469,
  //   },
  //   {
  //     date: "2025-12-26",
  //     price: 273.5689697265625,
  //   },
  //   {
  //     date: "2025-12-27",
  //     price: 273.494873046875,
  //   },
  //   {
  //     date: "2025-12-28",
  //     price: 273.49456787109375,
  //   },
  //   {
  //     date: "2025-12-29",
  //     price: 273.54132080078125,
  //   },
  //   {
  //     date: "2025-12-30",
  //     price: 273.6188659667969,
  //   },
  //   {
  //     date: "2025-12-31",
  //     price: 273.7171325683594,
  //   },
  //   {
  //     date: "2026-01-01",
  //     price: 273.8297424316406,
  //   },
  //   {
  //     date: "2026-01-02",
  //     price: 273.9524841308594,
  //   },
  //   {
  //     date: "2026-01-03",
  //     price: 274.0827331542969,
  //   },
  //   {
  //     date: "2026-01-04",
  //     price: 274.218505859375,
  //   },
  //   {
  //     date: "2026-01-05",
  //     price: 274.3583679199219,
  //   },
  //   {
  //     date: "2026-01-06",
  //     price: 274.5013427734375,
  //   },
  //   {
  //     date: "2026-01-07",
  //     price: 274.6465759277344,
  //   },
  // ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTick((t) => t + 1);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const positive = stock?.change >= 0;

  if (loading || !stock) {
    return (
      <SafeAreaView style={styles.safe}>
        <Loader />
      </SafeAreaView>
    );
  }

  const saveToWatchlist = async () => {
    setIsInWatchlist(!isInWatchlist);
    try {
      const res = await fetch(`${API_URL}/api/users/save-watchlist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log("Failed to save to watchlist:", errorText);
        return;
      }

      const data = await res.json();
      // console.log("Saved:", data);
    } catch (err) {
      console.log("Network / fetch error:", err);
    }
  };

  const getPredictionText = (predictChange) => {
    // Handle null/undefined/NaN
    if (predictChange == null || !Number.isFinite(predictChange)) {
      return "Waiting for prediction data...";
    }

    if (predictChange < 0) {
      return "Not recommended to buy. Expected negative return.";
    }

    if (predictChange === 0) {
      return "Uncertain outcome. Invest only if you have strong market knowledge.";
    }

    if (predictChange > 0 && predictChange <= 0.5) {
      return "Very low upside. Conservative investors should wait.";
    }

    if (predictChange > 0.5 && predictChange <= 1) {
      return "Low potential return. Suitable only for low-risk strategies.";
    }

    if (predictChange > 1 && predictChange <= 1.5) {
      return "Mild upside expected. Small gains possible.";
    }

    if (predictChange > 1.5 && predictChange <= 2) {
      return "Moderate growth potential. Entry could be considered.";
    }

    if (predictChange > 2 && predictChange <= 2.5) {
      return "Good upside. Favorable risk-to-reward ratio.";
    }

    if (predictChange > 2.5 && predictChange <= 3) {
      return "Strong growth signal. Suitable for medium-term holding.";
    }

    if (predictChange > 3 && predictChange <= 3.5) {
      return "Very strong momentum. Accumulation recommended.";
    }

    if (predictChange > 3.5 && predictChange <= 4) {
      return "High confidence buy signal. Bullish outlook.";
    }

    if (predictChange > 4 && predictChange <= 4.5) {
      return "Very bullish setup. Strong upside expected.";
    }

    if (predictChange > 4.5 && predictChange <= 5) {
      return "Excellent opportunity. High probability of strong returns.";
    }

    return "Extremely bullish. Strong buy with high return potential.";
  };

  // Calculate prediction change with proper null checks
  const calculatePredictChange = (predictions, currentPrice) => {
    // Check if we have predictions
    if (!predictions) return null;

    // Extract predictions array from API response
    const predictionArray = Array.isArray(predictions)
      ? predictions
      : predictions?.predictions || [];

    // Check if array has data
    if (!predictionArray || predictionArray.length === 0) return null;

    // Get last prediction (15 days out)
    const lastPrediction = predictionArray[predictionArray.length - 1];

    // Validate prediction data
    if (!lastPrediction || !lastPrediction.price) return null;

    // Validate current price
    const current = Number(currentPrice);
    if (!Number.isFinite(current) || current <= 0) return null;

    // Calculate percentage change
    const futurePrice = Number(lastPrediction.price);
    if (!Number.isFinite(futurePrice)) return null;

    return (futurePrice / current - 1) * 100;
  };

  // Get prediction array safely
  const getPredictionArray = (predictions) => {
    if (!predictions) return [];
    return Array.isArray(predictions)
      ? predictions
      : predictions?.predictions || [];
  };

  const predictionMeta = predictions?.meta ?? null;

  // Calculate predictChange with proper checks
  const predictionArray = getPredictionArray(predictions);
  const predictChange = calculatePredictChange(
    predictions,
    stock?.price || stock?.open || stock?.close,
  );
  const lastPrediction =
    predictionArray.length > 0
      ? predictionArray[predictionArray.length - 1]
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.circleBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.symbol}>{stock?.symbol}</Text>
            <Text style={styles.subSymbol}>{stock?.name}</Text>
          </View>

          <TouchableOpacity
            onPress={saveToWatchlist}
            style={styles.headerRight}
          >
            <Ionicons
              name={isInWatchlist ? "heart" : "heart-outline"}
              size={26}
              color="#d2d2d2ff"
              style={{
                marginRight: 12,
                borderRadius: 13,
                padding: 4,
              }}
            />
            {/* <Ionicons name="share-social-outline" size={20} color="#747474" /> */}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
            />
          }
        >
          {/* Price Area */}
          <View style={styles.priceArea}>
            <Text style={styles.price}>{stock?.price?.toFixed(2)}</Text>

            <View
              style={[
                styles.pill,
                { backgroundColor: positive ? "#163D2B" : "#3D1B1B" },
              ]}
            >
              <Text
                style={{
                  color: positive ? "#16C784" : "#EA3943",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                {positive ? "+" : ""}
                {stock?.changePercent?.toFixed(2)}%
              </Text>

              {/* <Text style={styles.changeText}>
                {positive ? "+" : ""}
                {stock.change?.toFixed(2)}
              </Text> */}
            </View>
          </View>
          {/* Time Tabs */}
          <View style={styles.tabs}>
            {TIME_RANGES.map((t) => {
              const isActive = selectedRange === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedRange(t)}
                  style={styles.tabItem}
                >
                  <Text
                    style={[styles.tabText, isActive && styles.tabActiveText]}
                  >
                    {t}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Chart Placeholder */}
          {/* <View style={styles.tabs}>
            {ranges.map((r) => (
              <Text
                key={r}
                onPress={() => setRange(r)}
                style={[styles.tabText, isActive && styles.tabActiveText]}
              >
                {r}
              </Text>
            ))}
          </View> */}
          <StockCandleChart
            rangeKey={selectedRange}
            chart={chart}
            loading={chartLoading}
          />
          {/* Stats Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>24h Overview</Text>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Open</Text>
                <Text style={styles.value}>{stock?.open}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>High</Text>
                <Text style={styles.value}>{stock?.high}</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.label}>Low</Text>
                <Text style={styles.value}>{stock?.low}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Volume</Text>
                <Text style={styles.value}>{stock?.volume}</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.label}>Change</Text>
                <Text
                  style={[
                    styles.value,
                    positive ? styles.greenText : styles.redText,
                  ]}
                >
                  {positive ? "+" : ""}
                  {stock?.changeFromOpen}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Change %</Text>
                <Text
                  style={[
                    styles.value,
                    positive ? styles.greenText : styles.redText,
                  ]}
                >
                  {positive ? "+" : ""}
                  {stock?.changeFromOpenPercent?.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          <TechnicalIndicators chart={chart} />
          <PredictiveGraph
            loading={predictionsLoading}
            predictions={predictions}
            symbol={stock?.symbol || symbol}
            currentPrice={stock?.price ?? stock?.open ?? stock?.close}
          />
          {predictionsWarming && !predictions && (
            <View style={[styles.card, styles.predictNotice]}>
              <ActivityIndicator color="#FFD700" />
              <Text style={styles.predictNoticeTitle}>
                Waking up the prediction model…
              </Text>
              <Text style={styles.predictNoticeBody}>
                The AI service was idle. It takes a few seconds to warm up, retrying automatically.
              </Text>
            </View>
          )}
          {predictionsError && !predictionsLoading && (
            <View style={[styles.card, styles.predictNotice]}>
              <Ionicons name="alert-circle" size={22} color="#EA3943" />
              <Text style={styles.predictNoticeTitle}>
                AI predictions unavailable
              </Text>
              <Text style={styles.predictNoticeBody}>{predictionsError}</Text>
              <TouchableOpacity
                onPress={() => setPredictionsRetry((n) => n + 1)}
                style={styles.predictRetryBtn}
              >
                <Ionicons name="refresh" size={14} color="#0D0D0D" />
                <Text style={styles.predictRetryTxt}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* {predictionArray.length > 0 && (
            <StockAISignal
              predictChange={predictChange}
              meta={predictionMeta}
              horizonDays={predictionArray.length}
            />
          )} */}

          {/* AI Insights, stock-specific, mirroring the AI Insights page */}
          {aiInsights ? (
            <View style={styles.insightsSection}>
              <StockSmartSummaryCard summary={aiInsights.summary} />
              <View style={styles.insightsRow}>
                <MarketSentimentCard sentiment={aiInsights.sentiment} />
                <StockRiskCard risk={aiInsights.risk} />
              </View>
              <AIInsightsFeed feed={aiInsights.feed} />
            </View>
          ) : aiInsightsLoading ? (
            <View style={[styles.card, { alignItems: "center" }]}>
              <ActivityIndicator color="#FFD700" />
              <Text style={[styles.label, { marginTop: 10 }]}>
                Generating AI insights…
              </Text>
            </View>
          ) : null}

          {predictionMeta && (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => setHowWePredictOpen((v) => !v)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: howWePredictOpen ? 8 : 0,
                }}
              >
                <Ionicons name="information-circle" size={16} color="#87CEEB" />
                <Text
                  style={[
                    styles.cardTitle,
                    { marginLeft: 6, marginBottom: 0, flex: 1 },
                  ]}
                >
                  How we predict
                </Text>
                <Ionicons
                  name={howWePredictOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#9aa0a6"
                />
              </TouchableOpacity>
              {howWePredictOpen && (
              <>
              <Text
                style={{
                  color: "#A7B1BC",
                  fontSize: 12,
                  lineHeight: 17,
                  marginBottom: 12,
                }}
              >
                Forecasts come from a recurrent neural network ({predictionMeta.model.type}) trained on {symbol}&apos;s historical daily closing prices. It looks at the last {predictionMeta.model.lookback_days} trading days to project the next {predictionArray.length} days.
              </Text>

              <Text style={[styles.cardSubTitle, { marginBottom: 6 }]}>
                Model
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Type</Text>
                <Text style={styles.metaValue}>{predictionMeta.model.type}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Architecture</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {predictionMeta.model.architecture}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Framework</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.model.framework}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Lookback</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.model.lookback_days} days
                </Text>
              </View>
              {predictionMeta.model.last_trained && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Last trained</Text>
                  <Text style={styles.metaValue}>
                    {predictionMeta.model.last_trained}
                  </Text>
                </View>
              )}

              <Text
                style={[
                  styles.cardSubTitle,
                  { marginTop: 14, marginBottom: 6 },
                ]}
              >
                Training data
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Rows</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.training_data.rows}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Range</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.training_data.from} →{" "}
                  {predictionMeta.training_data.to}
                </Text>
              </View>

              <Text
                style={[
                  styles.cardSubTitle,
                  { marginTop: 14, marginBottom: 6 },
                ]}
              >
                Recent input signals (last {predictionMeta.model.lookback_days}d)
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Last close</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.input_stats.last_close.toFixed(2)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>60d mean</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.input_stats.mean_60d.toFixed(2)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>60d std dev</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.input_stats.stddev_60d.toFixed(2)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>60d range</Text>
                <Text style={styles.metaValue}>
                  {predictionMeta.input_stats.min_60d.toFixed(2)},{" "}
                  {predictionMeta.input_stats.max_60d.toFixed(2)}
                </Text>
              </View>
              {predictionMeta.input_stats.pct_change_30d != null && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>30d change</Text>
                  <Text
                    style={[
                      styles.metaValue,
                      {
                        color:
                          predictionMeta.input_stats.pct_change_30d >= 0
                            ? "#22c55e"
                            : "#ef4444",
                      },
                    ]}
                  >
                    {predictionMeta.input_stats.pct_change_30d >= 0 ? "+" : ""}
                    {predictionMeta.input_stats.pct_change_30d.toFixed(2)}%
                  </Text>
                </View>
              )}
              </>
              )}
            </View>
          )}
          {predictionArray.length > 0 && stock && (
            <>
              {/* Day Breakdown Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily Breakdown</Text>

                <View style={styles.dayGrid}>
                  {/* Header */}
                  <View style={[styles.dayGridItem]}>
                    <Text style={styles.dayLabel}>Date</Text>
                    <Text style={styles.dayLabel}>Predicted Price</Text>
                  </View>

                  {/* Data rows */}
                  {predictionArray.map((prediction, index) => {
                    const price = Number(prediction.price);
                    const isValid = Number.isFinite(price);

                    return (
                      <View
                        style={[
                          styles.dayGridItem,
                          index % 2 === 0 && styles.dayGridItemEven,
                        ]}
                        key={`${prediction.date}-${index}`}
                      >
                        <Text style={styles.dayValue}>
                          {prediction.date || "N/A"}
                        </Text>
                        <Text style={[styles.dayValue, styles.dayPrice]}>
                          {isValid ? price.toFixed(2) : "N/A"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}
          {/* // If predictions are loading, show this: */}
          {/* {predictionsLoading && (
            <View style={styles.card}>
              <ActivityIndicator color="#4ADE80" size="large" />
              <Text
                style={[styles.value, { textAlign: "center", marginTop: 12 }]}
              >
                Generating AI predictions...
              </Text>
            </View>
          )} */}
          {/* Action Buttons */}
          {/* <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Add to Portfolio</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Predict</Text>
            </TouchableOpacity>
          </View> */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#070707",
    height: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /** HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  symbol: {
    color: "#e8eaed",
    fontSize: 20,
    fontWeight: "700",
  },
  subSymbol: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  /** PRICE AREA */
  priceArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingTop: 10,
  },
  price: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  pill: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  greenBg: { backgroundColor: "#0DBA7D" },
  redBg: { backgroundColor: "#D9435E" },
  changeText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 14,
  },

  /** TABS */
  tabs: {
    flexDirection: "row",
    marginBottom: 14,
  },
  tabItem: {
    marginRight: 18,
    alignItems: "center",
  },
  tabText: {
    color: "#6E6E6E",
    fontSize: 14,
  },
  tabActiveText: {
    color: "#fff",
    fontWeight: "700",
  },
  tabIndicator: {
    width: 18,
    height: 2,
    backgroundColor: "#FFD700",
    marginTop: 6,
    borderRadius: 999,
  },

  /** CHART */
  chartBox: {
    height: 230,
    borderRadius: 16,
    backgroundColor: "#101014",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  chartPlaceholder: {
    color: "#555",
    fontSize: 13,
  },

  /** CARD */
  card: {
    backgroundColor: "#101014",
    padding: 18,
    borderRadius: 16,
    marginVertical: 20,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  cardSubTitle: {
    color: "#E6EEF8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1f24",
  },
  metaLabel: {
    color: "#8B96A5",
    fontSize: 12,
    flex: 1,
  },
  metaValue: {
    color: "#E6EEF8",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
    flex: 1.4,
  },

  /** GRID */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "33.3%",
    marginBottom: 14,
  },
  dayGrid: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  dayGridHeader: {
    backgroundColor: "#1F2937",
    borderRadius: 8,
    marginBottom: 4,
    borderBottomWidth: 0,
  },
  dayGridItem: {
    justifyContent: "space-between",
    width: "100%",
    flexDirection: "row",
    marginBottom: 14,
  },
  dayGridItemEven: {
    backgroundColor: "#0D1117",
  },
  label: {
    color: "#7A7A7A",
    fontSize: 12,
    marginBottom: 4,
  },
  dayLabel: {
    color: "#7A7A7A",
    fontSize: 14,
    textAlign: "center",
  },
  dayValue: {
    color: "#E6EEF8",
    fontSize: 13,
    fontWeight: "500",
  },

  dayPrice: {
    fontWeight: "600",
    color: "#4ADE80",
  },
  value: {
    color: "#dfdfdfff",
    fontSize: 15,
    fontWeight: "600",
  },
  AIValue: {
    color: "#87CEEB",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
    marginBottom: 4,
    marginTop: 15,
  },
  AIText: {
    color: "#dfdfdfff",
    fontSize: 15,
    fontWeight: "600",
  },
  greenText: { color: "#0DBA7D" },
  redText: { color: "#F05555" },

  /** PREDICTION NOTICE / RETRY */
  predictNotice: {
    alignItems: "center",
    gap: 6,
  },
  predictNoticeTitle: {
    color: "#e8eaed",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  predictNoticeBody: {
    color: "#9aa0a6",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 2,
  },
  predictRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#FFD700",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  predictRetryTxt: {
    color: "#0D0D0D",
    fontSize: 13,
    fontWeight: "700",
  },

  /** AI INSIGHTS SECTION */
  insightsSection: {
    // Cancel container's horizontal padding so the cards align with the
    // screen edges just like on the AI Insights page.
    marginHorizontal: -16,
    marginTop: 4,
  },
  insightsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },

  /** ACTION BUTTONS */
  actionRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#F5A623",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginRight: 10,
  },
  primaryText: {
    color: "#0D0D0D",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryBtn: {
    flex: 1,
    borderColor: "#333",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
