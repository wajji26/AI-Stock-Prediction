// controllers/newsController.js
const axios = require("axios");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Helper to get date string YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * GET /api/stocks/news
 * Optional: ?symbol=AAPL
 * Returns a list of max 15 news items
 */
exports.getStockNewsList = async (req, res) => {
  try {
    const { symbol } = req.query;

    const today = new Date();
    const to = formatDate(today);
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - 7); // last 7 days
    const from = formatDate(fromDate);

    let url;

    if (symbol) {
      // Company-specific news
      url = `https://finnhub.io/api/v1/company-news?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    } else {
      // General market news
      url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;
    }

    const { data } = await axios.get(url);

    // Finnhub uses UNIX timestamp (seconds) in `datetime`
    const mapped = (data || []).slice(0, 15).map((item) => ({
      id: item.id, // used for detail route
      title: item.headline,
      excerpt: item.summary,
      date: new Date(item.datetime * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      image: item.image || null,
    }));

    return res.json(mapped);
  } catch (error) {
    console.error(
      "Error fetching stock news list:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      message: "Failed to fetch stock news list",
    });
  }
};

/**
 * GET /api/stocks/news/:id
 * Optional: ?symbol=AAPL
 * Returns full article data for a single news item
 */
exports.getStockNewsDetail = async (req, res) => {
  const { id } = req.params;
  const { symbol } = req.query;

  if (!id) {
    return res.status(400).json({ message: "News id is required" });
  }

  try {
    const today = new Date();
    const to = formatDate(today);
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - 30); // search within last 30 days
    const from = formatDate(fromDate);

    let url;

    if (symbol) {
      url = `https://finnhub.io/api/v1/company-news?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    } else {
      url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;
    }

    const { data } = await axios.get(url);

    const article = (data || []).find((item) => String(item.id) === String(id));

    if (!article) {
      return res.status(404).json({ message: "News article not found" });
    }

    return res.json({
      id: article.id,
      symbol: article.related || symbol || null,
      title: article.headline,
      text: article.summary, // Finnhub usually gives short summary; full text is at `url`
      source: article.source,
      url: article.url,
      image: article.image || null,
      datetime: new Date(article.datetime * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      category: article.category,
    });
  } catch (error) {
    console.error(
      "Error fetching stock news detail:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      message: "Failed to fetch stock news detail",
    });
  }
};
