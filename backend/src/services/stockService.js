const axios = require("axios");
const https = require("https");
const dotenv = require("dotenv");
const cheerio = require("cheerio");

dotenv.config();

// Force IPv4, Yahoo Finance over IPv6 is unreachable on many networks and
// causes axios to ETIMEDOUT instead of falling back like curl does.
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

const FINNHUB_BASE = "https://finnhub.io/api/v1";

const getLivePrice = async (symbol) => {
  try {
    const res = await axios.get(`${FINNHUB_BASE}/quote`, {
      params: { symbol, token: process.env.FINNHUB_API_KEY },
    });

    const data = res.data;

    return {
      symbol,
      currentPrice: data.c, // current price
      open: data.o, // open price
      high: data.h,
      low: data.l,
      prevClose: data.pc,
      change: data.d,
      percentChange: data.dp,
    };
  } catch (err) {
    console.error("Error fetching price:", err.message);
    throw new Error("Unable to fetch live price");
  }
};

const getAllSharesList = async (exchange = "US") => {
  try {
    const res = await axios.get(`${FINNHUB_BASE}/stock/symbol`, {
      params: {
        exchange,
        token: process.env.FINNHUB_API_KEY,
      },
    });

    return res.data.map((stock) => ({
      symbol: stock.symbol,
      name: stock.description,
      type: stock.type,
    }));
  } catch (err) {
    console.error(
      "Error fetching stock list:",
      err.response?.data || err.message,
    );
    throw new Error("Unable to fetch stock list");
  }
};

async function fetchStockData(ticker = "AAPL") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`;

  const response = await axios.get(url);
  const result = response.data.chart.result[0];

  const timestamps = result.timestamp;
  const indicators = result.indicators.quote[0];

  // Build features array: [Open, High, Low, Close, Volume]
  const features = timestamps.map((_, i) => [
    indicators.open[i],
    indicators.high[i],
    indicators.low[i],
    indicators.close[i],
    indicators.volume[i],
  ]);

  return features;
}

const getCompanyProfile = async (symbol) => {
  try {
    const res = await axios.get(`${FINNHUB_BASE}/stock/profile2`, {
      params: {
        symbol,
        token: process.env.FINNHUB_API_KEY,
      },
    });

    const data = res.data;

    return {
      name: data.name,
      logo: data.logo,
      currency: data.currency,
      exchange: data.exchange,
      marketCap: data.marketCapitalization,
    };
  } catch (err) {
    console.error("Error fetching company profile:", err.message);
    throw new Error("Unable to fetch company profile");
  }
};

const TD_BASE = process.env.TWELVE_DATA_BASE || "https://api.twelvedata.com";
const TD_KEY = process.env.TWELVE_DATA_API_KEY;

// Map your app filters -> interval + number of candles (outputsize)
// You can tweak these to match your UI density
const RANGE_PRESETS = {
  "1D": { interval: "15min", outputsize: 96 }, // 24h / 15m = 96
  "5D": { interval: "1h", outputsize: 120 }, // 5d * 24 = 120
  "1M": { interval: "4h", outputsize: 180 }, // enough detail, not dense
  "6M": { interval: "1day", outputsize: 140 },
  "1Y": { interval: "1day", outputsize: 220 },
};

function normalizeTwelveDataError(data) {
  // Twelve Data often returns { status: "error", message, code }
  if (data && data.status === "error") {
    const msg = data.message || "Twelve Data error";
    const code = data.code || "TD_ERROR";
    return new Error(`${msg} (${code})`);
  }
  return null;
}

const getCandlesTwelveData = async (symbol, range = "1M") => {
  if (!TD_KEY) throw new Error("TWELVE_DATA_API_KEY is missing");

  const preset = RANGE_PRESETS[range] || RANGE_PRESETS["1M"];
  const interval = preset.interval;
  const outputsize = preset.outputsize;

  try {
    const res = await axios.get(`${TD_BASE}/time_series`, {
      params: {
        symbol,
        interval,
        outputsize,
        apikey: TD_KEY,
        format: "JSON",
        // Optional but recommended:
        // timezone: "UTC",
        // order: "ASC"  // if supported; we'll sort anyway
      },
      timeout: 15000,
    });

    const tdErr = normalizeTwelveDataError(res.data);
    if (tdErr) throw tdErr;

    const values = res.data?.values;
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("No candle data returned");
    }

    // Twelve Data returns values in descending time order (commonly).
    // We'll normalize to ascending for charting.
    const candles = values
      .map((v) => ({
        timestamp: v.datetime, // string like "2025-12-24 10:00:00"
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume != null ? Number(v.volume) : null,
      }))
      .filter(
        (c) =>
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close),
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      symbol,
      range,
      interval,
      candles,
    };
  } catch (err) {
    const msg =
      err?.response?.data?.message || err.message || "Unable to fetch candles";
    throw new Error(msg);
  }
};
// Symbol -> company domain, used to render logos via img.logo.dev.
// Shared by fetchPSXData (list) and fetchSingleStock (detail + watchlist).
const LOGO_MAP = {
  AIRLINK: "airlinkcommunication.com",
  ATRL: "atrl.com.pk",
  CNERGY: "cnergyico.com",
  CPHL: "cphl.com.pk",
  DGKC: "dgcement.com",
  EFERT: "engrofertilizers.com",
  FCCL: "fcccl.com",
  FFL: "ffbl.com",
  FFC: "ffc.com.pk",
  GHNI: "ghni.com.pk",
  GLAXO: "gsk.com",
  HUBC: "hubpower.com",
  ISL: "isl.com.pk",
  LUCK: "lucky-cement.com",
  MARI: "maripetroleum.com",
  MEBL: "meezanbank.com",
  MLCF: "mapleleafcement.com",
  NRL: "nrl.com.pk",
  OGDC: "ogdcl.com",
  PAEL: "pak-elektron.com",
  PRL: "prl.com.pk",
  PPL: "ppl.com.pk",
  PSO: "psopk.com",
  SAZEW: "sazew.com.pk",
  SEARL: "searlecompany.com",
  SNGP: "sngpl.com.pk",
  SSGC: "ssgc.com.pk",
  SYS: "systems.com.pk",
  // --- Added blue-chips (20) ---
  HBL: "hbl.com",
  UBL: "ubl.com.pk",
  MCB: "mcb.com.pk",
  BAHL: "bankalhabib.com",
  BAFL: "bankalfalah.com",
  NBP: "nbp.com.pk",
  POL: "pakoil.com.pk",
  APL: "apl.com.pk",
  SHEL: "shell.com.pk",
  INDU: "toyota-indus.com",
  MTL: "millattractors.com",
  HCAR: "honda.com.pk",
  NESTLE: "nestle.pk",
  COLG: "colgate.com.pk",
  NATF: "nationalfoods.com",
  EPCL: "engropolymer.com",
  FATIMA: "fatima-group.com",
  NML: "nishatmills.com",
  ILP: "interloop-pk.com",
  KEL: "ke.com.pk",
};

const fetchPSXData = async (filterKSE30 = false) => {
  const url = "https://scanner.tradingview.com/pakistan/scan";

  const KSE30_STOCKS = [
    "AIRLINK",
    "ATRL",
    "CNERGY",
    "CPHL",
    "DGKC",
    "EFERT",
    "FCCL",
    "FFL",
    "FFC",
    "GHNI",
    "GLAXO",
    "HUBC",
    "ISL",
    "LUCK",
    "MARI",
    "MEBL",
    "MLCF",
    "NRL",
    "OGDC",
    "PAEL",
    "PRL",
    "PPL",
    "PSO",
    "SAZEW",
    "SEARL",
    "SNGP",
    "SSGC",
    "SYS",
    // --- Added blue-chips (20) ---
    "HBL",
    "UBL",
    "MCB",
    "BAHL",
    "BAFL",
    "NBP",
    "POL",
    "APL",
    "SHEL",
    "INDU",
    "MTL",
    "HCAR",
    "NESTLE",
    "COLG",
    "NATF",
    "EPCL",
    "FATIMA",
    "NML",
    "ILP",
    "KEL",
  ];

  // Build tickers array for KSE-30 if filtering
  const tickers = filterKSE30
    ? KSE30_STOCKS.map((symbol) => `PSX:${symbol}`)
    : [];

  const body = {
    filter: [],
    options: { lang: "en" },
    markets: ["pakistan"],
    symbols: {
      query: { types: [] },
      tickers: tickers,
    },
    columns: [
      "name",
      "close",
      "change",
      "change_abs",
      "open",
      "high",
      "low",
      "volume",
      "volume_change",
      "time",
    ],
    sort: {
      sortBy: "name",
      sortOrder: "asc",
    },
    range: [0, filterKSE30 ? 60 : 500],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Origin: "https://www.tradingview.com",
      Referer: "https://www.tradingview.com/",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!text.startsWith("{")) {
    console.error("Non-JSON response:", text);
    return [];
  }

  const json = JSON.parse(text);

  // Format current time in Pakistan Standard Time (UTC+5)
  const pktTime =
    new Date(new Date().getTime() + 5 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "") + "+05:00";

  return json.data
    .map((item) => {
      // Helper function to safely parse numbers
      const safeNumber = (value, decimals = 2) => {
        if (value == null || isNaN(value)) return null;
        return parseFloat(Number(value).toFixed(decimals));
      };

      const price = safeNumber(item.d[1]);
      const changePercent = safeNumber(item.d[2]);
      const changeAbsolute = safeNumber(item.d[3]);
      const open = safeNumber(item.d[4]);
      const high = safeNumber(item.d[5]);
      const low = safeNumber(item.d[6]);

      // Skip stocks with missing critical data
      if (price === null) {
        console.warn(`Skipping ${item.s} - missing price data`);
        return null;
      }

      const symbol = item.s.replace("PSX:", "");

      // Get logo from mapping, or generate from symbol if not found
      const logo = LOGO_MAP[symbol];

      return {
        symbol,
        name: item.d?.[0] || symbol, // Use the name from TradingView data
        price,
        changePercent: changePercent ?? 0,
        changeAbsolute: changeAbsolute ?? 0,
        open: open ?? price,
        high: high ?? price,
        low: low ?? price,
        volume: item.d[7] ?? 0,
        logo, // Add logo field
        lastUpdated: pktTime,
        dataDelay: "15 min (TradingView Delayed)",
        isKSE30: KSE30_STOCKS.includes(symbol),
      };
    })
    .filter((item) => item !== null);
};

const fetchYahooCandles = async (yahooSymbol, range, interval) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

  const response = await axios.get(url, {
    params: { interval, range, includePrePost: false },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json,text/javascript,*/*;q=0.9",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `https://finance.yahoo.com/quote/${yahooSymbol}`,
    },
    timeout: 12000,
    httpsAgent: ipv4Agent,
    validateStatus: () => true, // we'll inspect status manually
  });

  if (response.status >= 400) {
    const detail =
      response.data?.chart?.error?.description ||
      response.data?.finance?.error?.description ||
      `HTTP ${response.status}`;
    const e = new Error(detail);
    e.status = response.status;
    throw e;
  }

  const result = response.data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp;
  const quote = result.indicators?.quote?.[0];
  if (!timestamps || !quote) return [];

  return timestamps
    .map((ts, i) => {
      if (
        quote.open?.[i] == null ||
        quote.high?.[i] == null ||
        quote.low?.[i] == null ||
        quote.close?.[i] == null
      ) {
        return null;
      }
      return {
        timestamp: new Date(ts * 1000).toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume?.[i] || 0,
      };
    })
    .filter(Boolean);
};

// Fallback ladder: if requested combo returns no candles (e.g. intraday on
// closed-market days), try progressively wider/coarser combos until we get data.
const FALLBACK_LADDER = {
  "1d/15m": [["5d", "30m"], ["1mo", "1d"]],
  "5d/30m": [["1mo", "1d"]],
  "1mo/1d": [["3mo", "1d"]],
  "6mo/1d": [["1y", "1d"]],
  "1y/1d": [["2y", "1d"]],
  "max/1d": [["5y", "1d"]],
};

const getPSXHistory = async (symbol, range = "1mo", interval = "1d") => {
  const yahooSymbol = `${symbol.toUpperCase()}.KA`;
  const attempts = [[range, interval], ...(FALLBACK_LADDER[`${range}/${interval}`] || [])];

  let lastErr = null;
  for (const [r, iv] of attempts) {
    try {
      const history = await fetchYahooCandles(yahooSymbol, r, iv);
      if (history.length > 0) {
        const usedFallback = r !== range || iv !== interval;
        console.log(
          `Fetched ${history.length} candles for ${symbol} (${r}/${iv})${usedFallback ? " [fallback]" : ""}`,
        );
        return {
          symbol: symbol.toUpperCase(),
          source: "Yahoo Finance",
          range: r,
          interval: iv,
          requestedRange: range,
          requestedInterval: interval,
          fallback: usedFallback,
          count: history.length,
          history,
        };
      }
    } catch (err) {
      lastErr = err;
      console.error(
        `Yahoo fetch failed for ${symbol} (${r}/${iv}):`,
        err.status || err.code || "",
        err.message,
      );
      if (err.status === 404) {
        throw new Error(`Stock ${symbol} not found`);
      }
    }
  }

  if (lastErr) {
    throw new Error(`Failed to fetch history for ${symbol}: ${lastErr.message}`);
  }

  // No error, just no data anywhere on the ladder
  return {
    symbol: symbol.toUpperCase(),
    source: "Yahoo Finance",
    range,
    interval,
    count: 0,
    history: [],
  };
};

// Helper function to get current stock data (for completeness)
const getPSXCurrentPrice = async (symbol) => {
  const yahooSymbol = `${symbol.toUpperCase()}.KA`;

  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      {
        params: {
          interval: "1d",
          range: "1d",
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      },
    );

    const result = response.data?.chart?.result?.[0];

    if (!result) {
      throw new Error(`No data found for ${symbol}`);
    }

    const meta = result.meta;
    const quote = result.indicators.quote[0];

    const timestamps = result.timestamp;
    const lastIdx = timestamps.length - 1;

    return {
      symbol: symbol.toUpperCase(),
      price: meta.regularMarketPrice || quote.close[lastIdx],
      previousClose: meta.previousClose || meta.chartPreviousClose,
      open: quote.open[lastIdx],
      high: quote.high[lastIdx],
      low: quote.low[lastIdx],
      volume: quote.volume[lastIdx],
      source: "Yahoo Finance",
    };
  } catch (err) {
    console.error(`Error fetching current price for ${symbol}:`, err.message);
    throw err;
  }
};

const fetchStockNews = async (symbol) => {
  const query = encodeURIComponent(`${symbol} PSX Pakistan stock`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-PK&gl=PK&ceid=PK:en`;

  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(res.data, { xmlMode: true });
    const news = [];

    $("item").each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find("title").text();
      const link = $(el).find("link").text();
      const pubDate = $(el).find("pubDate").text();
      const publisher = $(el).find("source").text();

      news.push({
        title,
        publisher,
        link,
        publishTime: new Date(pubDate).toISOString(),
        type: "STORY",
      });
    });

    return news;
  } catch (err) {
    console.error(`Error fetching news for ${symbol}:`, err.message);
    return [];
  }
};

async function fetchSingleStock(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const psxTicker = `PSX:${symbolUpper}`;
  const yahooTicker = `${symbolUpper}.KA`;

  const tvUrl = "https://scanner.tradingview.com/pakistan/scan";
  const tvBody = {
    filter: [],
    options: { lang: "en" },
    markets: ["pakistan"],
    symbols: { query: { types: [] }, tickers: [psxTicker] },
    columns: [
      "name",
      "close",
      "change",
      "change_abs",
      "open",
      "high",
      "low",
      "volume",
      "volume_change",
      "market_cap_calc",
      "price_52_week_high",
      "price_52_week_low",
      "dividend_yield_recent",
      "earnings_per_share_basic_ttm",
      "average_volume_10d_calc",
      "description",
      "sector",
      "industry",
      "number_of_employees",
      "country",
      "exchange",
      "total_revenue",
      "total_assets",
      "total_debt",
      "net_income",
      "free_cash_flow",
      "price_book_ratio",
      "return_on_equity_fy",
      "return_on_assets_fy",
      "operating_margin_ttm",
      "debt_to_equity_fy",
      "total_shares_outstanding",
      "average_volume_90d_calc",
      "relative_volume_10d_calc",
      "recommendation_mark",
      "RSI",
      "MACD.macd",
      "MACD.signal",
      "EMA20",
      "EMA50",
      "EMA100",
      "time",
    ],
    range: [0, 1],
  };

  try {
    const [tvRes, finnhubRes, newsRes] = await Promise.all([
      fetch(tvUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify(tvBody),
      }).then((r) => r.json()),
      axios
        .get(`${FINNHUB_BASE}/stock/profile2`, {
          params: { symbol: symbolUpper, token: process.env.FINNHUB_API_KEY },
        })
        .catch(() => ({ data: {} })),
      fetchStockNews(symbolUpper),
    ]);

    if (!tvRes.data || tvRes.data.length === 0) return null;

    const d = tvRes.data[0].d;
    const pktTime =
      new Date(new Date().getTime() + 5 * 60 * 60 * 1000)
        .toISOString()
        .replace("Z", "") + "+05:00";

    const price = d[1];
    const open = d[4];
    const eps = d[13];
    const peRatio = eps > 0 ? price / eps : null;

    const profileData = finnhubRes.data || {};

    return {
      symbol: symbolUpper,
      name: d[15] || profileData.name || symbolUpper,
      logo: LOGO_MAP[symbolUpper] || profileData.logo || null,
      website: profileData.weburl || null,
      price: parseFloat(price.toFixed(2)),
      changePercent: parseFloat(d[2].toFixed(2)),
      changeAbsolute: parseFloat(d[3].toFixed(2)),
      changeFromOpen: parseFloat((price - open).toFixed(2)),
      changeFromOpenPercent: parseFloat(
        (((price - open) / open) * 100).toFixed(2),
      ),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(d[5].toFixed(2)),
      low: parseFloat(d[6].toFixed(2)),
      volume: d[7],
      volumeChange: parseFloat((d[8] || 0).toFixed(2)),
      marketCap: d[9],
      high52Week: parseFloat((d[10] || 0).toFixed(2)),
      low52Week: parseFloat((d[11] || 0).toFixed(2)),
      dividendYield: parseFloat((d[12] || 0).toFixed(2)),
      eps: parseFloat((eps || 0).toFixed(2)),
      peRatio: peRatio ? parseFloat(peRatio.toFixed(2)) : null,
      avgVolume10d: d[14],
      sector: d[16] || profileData.finnhubIndustry || null,
      industry: d[17],
      profile: {
        employees: d[18] || null,
        country: d[19] || profileData.country || null,
        exchange: d[20] || profileData.exchange || "PSX",
        currency: profileData.currency || "PKR",
        ipo: profileData.ipo || null,
        phone: profileData.phone || null,
      },
      financials: {
        totalRevenue: d[21],
        totalAssets: d[22],
        totalDebt: d[23],
        netIncome: d[24],
        freeCashFlow: d[25],
        priceToBook: parseFloat((d[26] || 0).toFixed(2)),
        roe: parseFloat((d[27] || 0).toFixed(2)),
        roa: parseFloat((d[28] || 0).toFixed(2)),
        operatingMargin: parseFloat((d[29] || 0).toFixed(2)),
        debtToEquity: parseFloat((d[30] || 0).toFixed(2)),
        sharesOutstanding: d[31],
      },
      technicals: {
        avgVolume90d: d[32],
        relativeVolume: parseFloat((d[33] || 0).toFixed(2)),
        analystRating: d[34],
        rsi: parseFloat((d[35] || 0).toFixed(2)),
        macd: parseFloat((d[36] || 0).toFixed(2)),
        macdSignal: parseFloat((d[37] || 0).toFixed(2)),
        ema20: parseFloat((d[38] || 0).toFixed(2)),
        ema50: parseFloat((d[39] || 0).toFixed(2)),
        ema100: parseFloat((d[40] || 0).toFixed(2)),
      },
      news: newsRes,
      lastUpdated: pktTime,
      dataDelay: "15 min (TradingView Delayed)",
      source: "Multi-Source (TradingView, Yahoo, Finnhub, Google News)",
    };
  } catch (error) {
    console.error(
      `Fetch single stock multi-source failed for ${symbol}:`,
      error.message,
    );
    return null;
  }
}

module.exports = {
  getLivePrice,
  getAllSharesList,
  fetchStockData,
  getCompanyProfile,
  getCandlesTwelveData,
  getPSXHistory,
  fetchPSXData,
  fetchSingleStock,
  getPSXCurrentPrice,
};
