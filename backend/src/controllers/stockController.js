const {
  getAllSharesList,
  getLivePrice,
  getCompanyProfile,
  getCandlesTwelveData,
  fetchPSXData,
  getPSXHistory,
  fetchSingleStock,
} = require("../services/stockService.js");

const getStockCandles = async (req, res) => {
  const { symbol } = req.params;
  const { range } = req.query; // "1D" | "5D" | "1M" | "6M" | "1Y"

  if (!symbol)
    return res.status(400).json({ message: "Stock symbol is required" });

  try {
    const data = await getCandlesTwelveData(
      symbol.toUpperCase(),
      range || "1M",
    );
    return res.json(data);
  } catch (err) {
    // 429 = rate limit (common on free plan), but Twelve Data may send 400/401-style too
    return res.status(500).json({ message: err.message });
  }
};

const getStockPrice = async (req, res) => {
  const { symbol } = req.params;

  if (!symbol) {
    return res.status(400).json({ message: "Stock symbol is required" });
  }

  try {
    const priceData = await getLivePrice(symbol.toUpperCase());
    res.json(priceData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

let cachedStocks = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute caching

const getStocksList = async (req, res) => {
  const { exchange = "US" } = req.query;

  try {
    const now = Date.now();

    // 1. Serve cached data if fresh
    if (cachedStocks && now - lastFetchTime < CACHE_TTL) {
      return res.json(cachedStocks);
    }

    // 2. Fetch stock symbols list from Finnhub
    const stocks = await getAllSharesList(exchange);

    // Limit to avoid rate limits (tune 20 → 30 depending on your plan)
    const limited = stocks.slice(0, 20);

    // 3. Fetch profile + live price for all in parallel
    const results = await Promise.allSettled(
      limited.map(async (stock) => {
        const { symbol, name } = stock;

        const [profile, quote] = await Promise.all([
          getCompanyProfile(symbol),
          getLivePrice(symbol),
        ]);

        return {
          symbol,
          name: profile?.name || name,
          logo: profile?.logo || null,
          price: quote?.currentPrice ?? null,
          changePercent: quote?.percentChange ?? null,
        };
      }),
    );

    // 4. Collect successful results
    const finalList = [];
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value) {
        finalList.push(r.value);
      } else if (r.status === "rejected") {
        const { symbol } = limited[idx];
        console.log(
          `Error fetching for ${symbol}:`,
          r.reason?.message || r.reason,
        );
      }
    });

    const response = {
      count: finalList.length,
      data: finalList,
    };

    // 5. Save to cache
    cachedStocks = response;
    lastFetchTime = now;

    return res.json(response);
  } catch (err) {
    console.error("Error in getStocksList:", err.message);
    return res.status(500).json({ message: err.message });
  }
};
let psxCache = {
  lastUpdated: 0,
  data: [],
};

let kse30Cache = { lastUpdated: 0, data: [] };

// Get only KSE-30 stocks
const getKSE30Stocks = async (req, res) => {
  const now = Date.now();
  try {
    if (!kse30Cache.data.length || now - kse30Cache.lastUpdated > CACHE_TTL) {
      console.log("Fetching fresh KSE-30 data...");
      const data = await fetchPSXData(true);
      kse30Cache = { lastUpdated: now, data };
    }
    res.json(kse30Cache.data);
  } catch (err) {
    console.error("Error in getKSE30Stocks:", err.message);
    res.status(500).json({ error: "Failed to fetch KSE-30 data" });
  }
};

// Get all PSX stocks
const getPSXStocks = async (req, res) => {
  const now = Date.now();
  try {
    if (!psxCache.data.length || now - psxCache.lastUpdated > CACHE_TTL) {
      console.log("Fetching fresh PSX data...");
      const data = await fetchPSXData(false);
      psxCache = { lastUpdated: now, data };
    }
    res.json(psxCache.data);
  } catch (err) {
    console.error("Error in getPSXStocks:", err.message);
    res.status(500).json({ error: "Failed to fetch PSX data" });
  }
};

// Alternative: Filter from existing cache (faster but uses cached data)
const getSinglePSXStock = async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await fetchSingleStock(symbol);
    if (!data) return res.status(404).json({ error: "Stock not found" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const VALID_RANGES = [
  "1d",
  "5d",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "2y",
  "5y",
  "10y",
  "ytd",
  "max",
];
const VALID_INTERVALS = [
  "1m",
  "2m",
  "5m",
  "15m",
  "30m",
  "60m",
  "90m",
  "1h",
  "1d",
  "5d",
  "1wk",
  "1mo",
  "3mo",
];

const getPSXStockHistory = async (req, res) => {
  const { symbol } = req.params;
  const { range = "1mo", interval = "1d" } = req.query;

  // Validate inputs
  if (!VALID_RANGES.includes(range)) {
    return res.status(400).json({
      error: "Invalid range",
      validRanges: VALID_RANGES,
    });
  }

  if (!VALID_INTERVALS.includes(interval)) {
    return res.status(400).json({
      error: "Invalid interval",
      validIntervals: VALID_INTERVALS,
    });
  }

  try {
    const data = await getPSXHistory(symbol, range, interval);
    res.json(data);
  } catch (err) {
    console.error("Error in getPSXStockHistory:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getStockPrice,
  getStocksList,
  getStockCandles,
  getPSXStocks,
  getSinglePSXStock,
  getPSXStockHistory,
  getKSE30Stocks,
};
