// PortfolioPredictionGraph.jsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LineChart } from "react-native-wagmi-charts";

const DAY = 24 * 60 * 60 * 1000;

// IMPORTANT: Use the SAME color function as your pie chart
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

// Safe parse for "YYYY-MM-DD" into UTC midnight (ms)
function toMs(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

function niceStep(rawStep) {
  if (rawStep <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const n = rawStep / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function buildYTicks(min, max, count = 5) {
  if (count < 2) return [min];
  if (min === max) return [min];

  const raw = (max - min) / (count - 1);
  const step = niceStep(raw || 1);
  const start = Math.floor(min / step) * step;

  const ticks = [];
  for (let i = 0; i < count; i++) {
    const tick = start + i * step;
    if (tick >= min - step * 0.1 && tick <= max + step * 0.1) {
      ticks.push(tick);
    }
  }

  return ticks.length > 0 ? ticks : [min, max];
}

function formatDay(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatYValue(value) {
  if (value >= 1000) {
    return value.toFixed(0);
  } else if (value >= 100) {
    return value.toFixed(1);
  } else {
    return value.toFixed(2);
  }
}

export default function PortfolioPredictionGraph({
  portfolioData = null,
  loading = false,
}) {
  // Process portfolio data into multi-line format
  const { stocks, allDates, yRange } = useMemo(() => {
    if (!portfolioData || !portfolioData.portfolio) {
      return { stocks: [], allDates: [], yRange: { min: 0, max: 0 } };
    }

    const portfolio = portfolioData.portfolio;
    const stocksData = [];
    const dateSet = new Set();
    let globalMin = Infinity;
    let globalMax = -Infinity;

    // Process each stock
    portfolio.forEach((stock) => {
      if (!stock.predictionData || stock.predictionData.length === 0) return;

      const color = getColorFromSymbol(stock.symbol);
      const data = stock.predictionData
        .map((p) => {
          const ts = toMs(p.date);
          const value = Number(p.price);
          if (!ts || !Number.isFinite(value)) return null;

          dateSet.add(ts);

          // Track min/max for y-axis
          if (value < globalMin) globalMin = value;
          if (value > globalMax) globalMax = value;

          return { timestamp: ts, value };
        })
        .filter(Boolean);

      data.sort((a, b) => a.timestamp - b.timestamp);

      stocksData.push({
        symbol: stock.symbol,
        quantity: stock.quantity,
        currentPrice: stock.currentPrice,
        predictedPrice: stock.predictedPrice,
        color,
        data,
      });
    });

    // Get all unique dates sorted
    const dates = Array.from(dateSet).sort((a, b) => a - b);

    // Calculate y range with padding
    if (!Number.isFinite(globalMin) || !Number.isFinite(globalMax)) {
      return {
        stocks: stocksData,
        allDates: dates,
        yRange: { min: 0, max: 0 },
      };
    }

    if (globalMin === globalMax) {
      return {
        stocks: stocksData,
        allDates: dates,
        yRange: { min: globalMin * 0.95, max: globalMax * 1.05 },
      };
    }

    const pad = (globalMax - globalMin) * 0.05;
    const step = niceStep((globalMax - globalMin) / 4 || 1);
    const yMin = Math.floor((globalMin - pad) / step) * step;
    const yMax = Math.ceil((globalMax + pad) / step) * step;

    return {
      stocks: stocksData,
      allDates: dates,
      yRange: { min: yMin, max: yMax },
    };
  }, [portfolioData]);

  // UI sizing
  const screenW = Dimensions.get("window").width;
  const CHART_HEIGHT = 250;
  const Y_AXIS_W = 56;
  const PADDING_X = 16;
  const chartW = screenW - PADDING_X * 2 - Y_AXIS_W;

  // X domain (all dates)
  const xDomain = useMemo(() => {
    if (allDates.length === 0) return undefined;
    return [allDates[0], allDates[allDates.length - 1]];
  }, [allDates]);

  // Y ticks
  const yTicks = useMemo(() => {
    if (!yRange || yRange.min === yRange.max) return [];
    return buildYTicks(yRange.min, yRange.max, 5).slice().reverse();
  }, [yRange]);

  // X ticks
  const xTicks = useMemo(() => {
    if (!xDomain || allDates.length === 0) return [];

    const count = Math.min(5, allDates.length);
    const ticks = [];

    for (let i = 0; i < count; i++) {
      const idx = Math.round((i * (allDates.length - 1)) / (count - 1));
      ticks.push(allDates[idx]);
    }

    return ticks;
  }, [xDomain, allDates]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>7 Days Portfolio Forecast</Text>
          <View style={styles.underline} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#4ADE80" size="large" />
          <Text style={styles.loadingText}>Generating predictions...</Text>
        </View>
      </View>
    );
  }

  if (stocks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>7 Days Portfolio Forecast</Text>
          <View style={styles.underline} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No prediction data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>7 Days Portfolio Forecast</Text>
        <View style={styles.underline} />
      </View>

      {/* Portfolio Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Current Value</Text>
            <Text style={styles.summaryValue}>
              Rs{" "}
              {portfolioData.currentTotal?.toLocaleString("en-PK", {
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Predicted Value</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    portfolioData.predictedTotal >= portfolioData.currentTotal
                      ? "#22c55e"
                      : "#ef4444",
                },
              ]}
            >
              Rs{" "}
              {portfolioData.predictedTotal?.toLocaleString("en-PK", {
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>
        </View>
        <View style={styles.changeContainer}>
          <Text style={styles.changeLabel}>Expected Change:</Text>
          <Text
            style={[
              styles.changeValue,
              {
                color:
                  portfolioData.predictedTotal >= portfolioData.currentTotal
                    ? "#22c55e"
                    : "#ef4444",
              },
            ]}
          >
            {portfolioData.predictedTotal >= portfolioData.currentTotal
              ? "+"
              : ""}
            {(
              ((portfolioData.predictedTotal - portfolioData.currentTotal) /
                portfolioData.currentTotal) *
              100
            ).toFixed(2)}
            %
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {/* We'll render each stock's line separately */}
        <View style={styles.chartRow}>
          {/* Chart area */}
          <View style={styles.chartWrapper}>
            <View
              style={{
                position: "relative",
                width: chartW,
                height: CHART_HEIGHT,
              }}
            >
              {stocks.map((stock, index) => (
                <View
                  key={stock.symbol}
                  style={{
                    position: index === 0 ? "relative" : "absolute",
                    top: 0,
                    left: 0,
                    width: chartW,
                    height: CHART_HEIGHT,
                  }}
                >
                  <LineChart.Provider
                    data={stock.data}
                    yRange={yRange}
                    xDomain={xDomain}
                  >
                    <LineChart width={chartW} height={CHART_HEIGHT}>
                      <LineChart.Path color={stock.color} width={2} />
                      {/* Only show cursor on first chart to avoid conflicts */}
                      {index === 0 && (
                        <LineChart.CursorCrosshair
                          color="#6B7280"
                          outerSize={40}
                          size={8}
                        >
                          <LineChart.Tooltip
                            position="top"
                            textStyle={styles.tooltipText}
                          />
                        </LineChart.CursorCrosshair>
                      )}
                    </LineChart>
                  </LineChart.Provider>
                </View>
              ))}
            </View>
          </View>

          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {yTicks.map((v, i) => (
              <Text key={`y-${i}`} style={styles.yAxisLabel}>
                {formatYValue(v)}
              </Text>
            ))}
          </View>
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisContainer}>
          <View style={styles.xAxisLabels}>
            {xTicks.map((ts, i) => (
              <Text key={`x-${i}`} style={styles.xAxisLabel}>
                {formatDay(ts)}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Stocks in Portfolio:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendScroll}
        >
          {stocks.map((stock) => (
            <View key={stock.symbol} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: stock.color }]}
              />
              <View>
                <Text style={styles.legendSymbol}>{stock.symbol}</Text>
                <Text style={styles.legendQuantity}>
                  {stock.quantity} shares
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Stock Details Table */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Detailed Breakdown</Text>
        {stocks.map((stock) => {
          const change =
            ((stock.predictedPrice - stock.currentPrice) / stock.currentPrice) *
            100;

          return (
            <View key={stock.symbol} style={styles.detailRow}>
              <View style={styles.detailHeader}>
                <View style={styles.detailSymbolRow}>
                  <View
                    style={[styles.detailDot, { backgroundColor: stock.color }]}
                  />
                  <Text style={styles.detailSymbol}>{stock.symbol}</Text>
                </View>
                <Text
                  style={[
                    styles.detailChange,
                    { color: change >= 0 ? "#22c55e" : "#ef4444" },
                  ]}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.detailInfo}>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailLabel}>Current</Text>
                  <Text style={styles.detailValue}>
                    Rs {stock.currentPrice.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailLabel}>Predicted</Text>
                  <Text style={styles.detailValue}>
                    Rs {stock.predictedPrice.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{stock.quantity}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },

  header: {
    marginBottom: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  underline: {
    marginTop: 6,
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#4ADE80",
  },

  loadingContainer: {
    height: 320,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101014",
    marginTop: 12,
  },

  loadingText: {
    color: "#A7B1BC",
    fontSize: 13,
    marginTop: 12,
  },

  emptyContainer: {
    height: 320,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101014",
    marginTop: 12,
  },

  emptyText: {
    color: "#A7B1BC",
    fontSize: 14,
  },

  summaryCard: {
    backgroundColor: "#101014",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  summaryItem: {
    flex: 1,
  },

  summaryLabel: {
    color: "#8B96A5",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },

  summaryValue: {
    color: "#E6EEF8",
    fontSize: 18,
    fontWeight: "700",
  },

  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },

  changeLabel: {
    color: "#8B96A5",
    fontSize: 13,
    fontWeight: "500",
    marginRight: 8,
  },

  changeValue: {
    fontSize: 16,
    fontWeight: "700",
  },

  chartContainer: {
    borderRadius: 14,
    backgroundColor: "#101014",
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  chartRow: {
    flexDirection: "row",
  },

  chartWrapper: {
    flex: 1,
  },

  yAxisContainer: {
    width: "100%",
    height: 250,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingVertical: 2,
  },

  yAxisLabel: {
    color: "#8B96A5",
    fontSize: 9,
    fontWeight: "500",
  },

  xAxisContainer: {
    marginTop: 8,
  },

  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 0,
  },

  xAxisLabel: {
    color: "#8B96A5",
    fontSize: 10,
    fontWeight: "500",
  },

  tooltipText: {
    color: "#E6EEF8",
    fontSize: 11,
    fontWeight: "600",
  },

  legendContainer: {
    backgroundColor: "#101014",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },

  legendTitle: {
    color: "#E6EEF8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },

  legendScroll: {
    gap: 16,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendSymbol: {
    color: "#E6EEF8",
    fontSize: 12,
    fontWeight: "600",
  },

  legendQuantity: {
    color: "#8B96A5",
    fontSize: 10,
    marginTop: 2,
  },

  detailsCard: {
    backgroundColor: "#101014",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },

  detailsTitle: {
    color: "#E6EEF8",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },

  detailRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },

  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  detailSymbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  detailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  detailSymbol: {
    color: "#E6EEF8",
    fontSize: 15,
    fontWeight: "700",
  },

  detailChange: {
    fontSize: 14,
    fontWeight: "700",
  },

  detailInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailInfoItem: {
    flex: 1,
  },

  detailLabel: {
    color: "#8B96A5",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },

  detailValue: {
    color: "#E6EEF8",
    fontSize: 13,
    fontWeight: "600",
  },
});
