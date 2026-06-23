// data/stockAIInsights.js
//
// Derives stock-specific AI Insights cards (smart summary, market sentiment,
// risk analysis, notification feed) from the data the stock detail page
// already fetches, the live PSX quote, the prediction payload (with its
// input_stats meta), the KSE-30 market snapshot, and symbol-tagged news.
//
// All values are derived directly from those inputs, nothing is fabricated.

import { fetchAllStocks } from "./stocks";
import { fetchNews } from "./news";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mean = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const stdev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
};

function intradayStrength(s) {
  if (!s) return 0.5;
  const high = Number(s.high);
  const low = Number(s.low);
  const price = Number(s.price);
  if (!Number.isFinite(high) || !Number.isFinite(low) || high <= low) return 0.5;
  const ref = Number.isFinite(price) ? price : low;
  return clamp((ref - low) / (high - low), 0, 1);
}

function relativeTime(dateStr) {
  if (!dateStr) return "just now";
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return dateStr;
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 6e4))} min ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---- Smart Summary (stock) ----------------------------------------------

function buildStockSummary({ stock, predictChange, stats, marketMove }) {
  const change = Number(stock?.changePercent);
  const hasIntraday = Number.isFinite(change);
  const hasPrediction =
    predictChange != null && Number.isFinite(predictChange);

  const vsMarket =
    hasIntraday && Number.isFinite(marketMove) ? change - marketMove : null;

  // Health 0..100 = today's move vs market + predicted upside + intraday strength
  const strength = intradayStrength(stock); // 0..1
  let health = 50;
  if (hasIntraday) health += clamp(change, -5, 5) * 3; // up to ±15
  if (vsMarket != null) health += clamp(vsMarket, -3, 3) * 2; // up to ±6
  if (hasPrediction) health += clamp(predictChange, -8, 8) * 2.5; // up to ±20
  health += (strength - 0.5) * 10; // up to ±5
  health = clamp(Math.round(health), 0, 100);

  let verdict = "Needs caution";
  if (health >= 70) verdict = "Strong opportunity";
  else if (health >= 55) verdict = "Looking constructive";
  else if (health >= 40) verdict = "Mixed signals";

  // Confidence rises with lower 60d volatility and more available signal.
  const cvPct =
    stats && stats.mean_60d
      ? (stats.stddev_60d / stats.mean_60d) * 100
      : null;
  let confidence = 60;
  if (cvPct != null) confidence = clamp(100 - cvPct * 9, 30, 95);
  if (!hasPrediction) confidence -= 10;
  if (!hasIntraday) confidence -= 10;
  confidence = clamp(Math.round(confidence), 25, 95);

  // Build a one-sentence narrative grounded in the numbers we actually have.
  const sym = stock?.symbol || "This stock";
  let narrative;
  if (hasIntraday && vsMarket != null) {
    const dir = vsMarket >= 0 ? "outperforming" : "underperforming";
    narrative = {
      lead: `${sym} is `,
      hl1: { text: `${dir} the KSE-30`, positive: vsMarket >= 0 },
      mid: " by ",
      hl2: {
        text: `${Math.abs(vsMarket).toFixed(2)}%`,
        positive: vsMarket >= 0,
      },
      tail: " today.",
    };
  } else if (hasIntraday) {
    narrative = {
      lead: `${sym} is `,
      hl1: {
        text: `${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}%`,
        positive: change >= 0,
      },
      tail: " on the session.",
    };
  } else {
    narrative = { lead: `Live quote unavailable for ${sym} right now.` };
  }

  return {
    health,
    confidence,
    verdict,
    narrative,
    vsMarket,
    indexName: "KSE 30 Index",
  };
}

// ---- Market Sentiment (context) -----------------------------------------

function buildMarketSentiment(stocks) {
  const valid = stocks.filter((s) => Number.isFinite(s.changePercent));
  if (!valid.length) {
    return {
      score: 50,
      label: "Neutral",
      color: "#FFD700",
      blurb: "Market data unavailable right now.",
    };
  }
  const advancers = valid.filter((s) => s.changePercent > 0).length;
  const decliners = valid.filter((s) => s.changePercent < 0).length;
  const total = valid.length;
  const breadth = (advancers - decliners) / total;
  const avgMove = mean(valid.map((s) => s.changePercent));
  const avgStrength = mean(valid.map(intradayStrength));

  const score = clamp(
    Math.round(
      50 + breadth * 35 + clamp(avgMove, -3, 3) * 4 + (avgStrength - 0.5) * 20,
    ),
    0,
    100,
  );

  let label = "Neutral";
  let color = "#FFD700";
  let blurb = `Breadth is balanced, ${advancers} up vs ${decliners} down on the KSE-30.`;
  if (score < 25) {
    label = "Extreme Fear";
    color = "#EA3943";
    blurb = `Heavy selling, only ${advancers} of ${total} KSE-30 names are green.`;
  } else if (score < 45) {
    label = "Fear";
    color = "#FF8A00";
    blurb = `Caution dominates, ${decliners} decliners outweigh ${advancers} advancers.`;
  } else if (score < 56) {
    label = "Neutral";
    color = "#FFD700";
    blurb = `Breadth is balanced, ${advancers} up vs ${decliners} down on the KSE-30.`;
  } else if (score < 75) {
    label = "Greed";
    color = "#7CCB57";
    blurb = `Buying interest is strong, ${advancers} of ${total} KSE-30 names are green.`;
  } else {
    label = "Extreme Greed";
    color = "#16C784";
    blurb = `Risk appetite is high, ${advancers} of ${total} KSE-30 names are green.`;
  }

  return { score, label, color, blurb, advancers, decliners };
}

// ---- Stock Risk Analysis ------------------------------------------------

function buildStockRisk({ stock, stats, stocks }) {
  // Volatility from the 60d coefficient of variation when available; fall
  // back to today's intraday range vs price.
  let cvPct = null;
  if (stats && stats.mean_60d) {
    cvPct = (stats.stddev_60d / stats.mean_60d) * 100;
  } else if (
    stock &&
    Number.isFinite(stock.high) &&
    Number.isFinite(stock.low) &&
    Number.isFinite(stock.price) &&
    stock.price > 0
  ) {
    cvPct = ((stock.high - stock.low) / stock.price) * 100;
  }

  let volatility = "—";
  if (cvPct != null) {
    if (cvPct < 1.5) volatility = "Low";
    else if (cvPct < 3.5) volatility = "Medium";
    else volatility = "High";
  }

  // Drawdown risk = how far the last close sits below the 60d high.
  let drawdownPct = null;
  let drawdown = "—";
  if (stats && Number.isFinite(stats.max_60d) && stats.max_60d > 0) {
    drawdownPct =
      ((stats.max_60d - stats.last_close) / stats.max_60d) * 100;
    if (drawdownPct < 5) drawdown = "Low";
    else if (drawdownPct < 12) drawdown = "Medium";
    else drawdown = "High";
  }

  // Beta-like: stock's intraday move scaled by the std-dev of KSE-30 moves.
  const marketMoves = stocks
    .map((s) => s.changePercent)
    .filter(Number.isFinite);
  const mktVol = stdev(marketMoves);
  const stockMove = Number(stock?.changePercent);
  let beta = null;
  if (Number.isFinite(stockMove) && mktVol > 0) {
    beta = clamp(Math.abs(stockMove) / mktVol, 0.2, 2.5);
  }

  let level = "Moderate Risk";
  let levelColor = "#FFD700";
  const pts =
    (volatility === "High" ? 2 : volatility === "Medium" ? 1 : 0) +
    (drawdown === "High" ? 2 : drawdown === "Medium" ? 1 : 0) +
    (beta != null && beta > 1.3 ? 1 : 0);
  if (pts >= 4) {
    level = "High Risk";
    levelColor = "#EA3943";
  } else if (pts <= 1) {
    level = "Low Risk";
    levelColor = "#16C784";
  }

  let advice = "Monitor volume and volatility for confirmation.";
  if (volatility === "High")
    advice = "Size positions smaller, swings are wider than usual.";
  else if (drawdown === "High")
    advice = `Price sits ${drawdownPct.toFixed(1)}% below its 60d high, wait for support.`;
  else if (beta != null && beta > 1.3)
    advice = "Moves faster than the market, expect amplified swings.";
  else if (volatility === "Low" && drawdown === "Low")
    advice = "Stable behavior, suitable for steady accumulation.";

  return {
    level,
    levelColor,
    volatility,
    drawdown,
    drawdownPct,
    beta,
    advice,
  };
}

// ---- Insights Feed ------------------------------------------------------

// Keep only news that actually reference this stock, match the ticker as a
// whole word or a distinctive token from the company name. Anything else
// (generic market headlines from the fallback feed, unrelated companies that
// share a substring) is dropped so the panel never shows irrelevant news.
function filterRelevantNews(news, stock) {
  if (!Array.isArray(news) || !stock?.symbol) return [];
  const sym = stock.symbol.toUpperCase();
  const stop = new Set([
    "THE",
    "AND",
    "LTD",
    "LIMITED",
    "INC",
    "CORP",
    "COMPANY",
    "CO",
    "PLC",
    "GROUP",
    "HOLDINGS",
    "PAKISTAN",
    "PVT",
    "PRIVATE",
  ]);
  const nameTokens = (stock.name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !stop.has(t));

  const symRe = new RegExp(`\\b${sym}\\b`);

  return news.filter((n) => {
    if (!n?.title) return false;
    const hay = `${n.title} ${n.excerpt || ""}`.toUpperCase();
    if (symRe.test(hay)) return true;
    return nameTokens.some((t) => hay.includes(t));
  });
}

function buildFeed({ stock, predictChange, stats, sentiment, news, horizon }) {
  const feed = [];
  const sym = stock?.symbol || "Stock";

  if (predictChange != null && Number.isFinite(predictChange)) {
    const up = predictChange >= 0;
    feed.push({
      id: "ai-forecast",
      icon: up ? "trending-up" : "trending-down",
      tone: up ? "up" : "down",
      tag: "AI Forecast",
      title: `Model projects ${up ? "+" : ""}${predictChange.toFixed(2)}% over ${horizon || "the forecast"} days`,
      body: up
        ? `The LSTM expects ${sym} to drift higher relative to its current close.`
        : `The LSTM expects ${sym} to drift lower, momentum may be fading.`,
      time: "live",
    });
  }

  if (Number.isFinite(stock?.changePercent)) {
    const up = stock.changePercent >= 0;
    const strength = intradayStrength(stock);
    const inUpperHalf = strength >= 0.5;
    feed.push({
      id: "momentum",
      icon: up ? "trending-up" : "trending-down",
      tone: up ? "up" : "down",
      tag: "Momentum",
      title: `${sym} is ${up ? "up" : "down"} ${Math.abs(stock.changePercent).toFixed(2)}% today`,
      body: `Price is trading in the ${inUpperHalf ? "upper" : "lower"} ${Math.round((inUpperHalf ? strength : 1 - strength) * 100)}% of today's range (${stock.low?.toFixed(2)} – ${stock.high?.toFixed(2)}).`,
      time: "live",
    });
  }

  if (stats && Number.isFinite(stats.pct_change_30d)) {
    const up = stats.pct_change_30d >= 0;
    feed.push({
      id: "trend-30d",
      icon: "stats-chart",
      tone: up ? "up" : "down",
      tag: "30d Trend",
      title: `${up ? "+" : ""}${stats.pct_change_30d.toFixed(2)}% over the last 30 trading days`,
      body: `60d range ${stats.min_60d.toFixed(2)} – ${stats.max_60d.toFixed(2)}, mean ${stats.mean_60d.toFixed(2)}.`,
      time: "30d",
    });
  }

  if (sentiment) {
    feed.push({
      id: "sentiment",
      icon: "speedometer",
      tone:
        sentiment.score >= 56
          ? "up"
          : sentiment.score < 45
            ? "down"
            : "neutral",
      tag: "Market Context",
      title: `KSE-30 sentiment reads "${sentiment.label}" (${sentiment.score}/100)`,
      body: sentiment.blurb,
      time: "live",
    });
  }

  const relevantNews = filterRelevantNews(news, stock);
  relevantNews.slice(0, 3).forEach((n, i) => {
    feed.push({
      id: `news-${n.id ?? i}`,
      icon: "newspaper",
      tone: "neutral",
      tag: "News",
      title: n.title,
      body:
        n.excerpt ||
        `Recent headline mentioning ${sym}.`,
      time: relativeTime(n.date),
    });
  });

  return feed;
}

// ---- Orchestrator -------------------------------------------------------

export async function loadStockAIInsights({
  token,
  stock,
  predictions,
  predictChange,
}) {
  const symbol = stock?.symbol;
  const [stocksRes, newsRes] = await Promise.allSettled([
    fetchAllStocks(token),
    fetchNews(token, symbol),
  ]);

  const stocks =
    stocksRes.status === "fulfilled" && Array.isArray(stocksRes.value)
      ? stocksRes.value
      : [];
  const news = newsRes.status === "fulfilled" ? newsRes.value || [] : [];

  const stats = predictions?.meta?.input_stats ?? null;
  const horizon = Array.isArray(predictions?.predictions)
    ? predictions.predictions.length
    : Array.isArray(predictions)
      ? predictions.length
      : null;

  const marketMoves = stocks
    .map((s) => s.changePercent)
    .filter(Number.isFinite);
  const marketMove = marketMoves.length ? mean(marketMoves) : null;

  const summary = buildStockSummary({
    stock,
    predictChange,
    stats,
    marketMove,
  });
  const sentiment = buildMarketSentiment(stocks);
  const risk = buildStockRisk({ stock, stats, stocks });
  const feed = buildFeed({
    stock,
    predictChange,
    stats,
    sentiment,
    news,
    horizon,
  });

  return {
    summary,
    sentiment,
    risk,
    feed,
    updatedAt: Date.now(),
  };
}
