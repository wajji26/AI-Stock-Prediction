const {
  fetchEarningsCalendar,
  fetchDividends,
  fetchListings,
  ymd,
} = require("../services/calendarService.js");

// GET /api/calendar/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
// Defaults to a ~2-month window around today if not provided.
const getEarnings = async (req, res) => {
  try {
    let { from, to } = req.query;
    if (!from || !to) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(now);
      end.setDate(end.getDate() + 60);
      from = from || ymd(start);
      to = to || ymd(end);
    }
    const data = await fetchEarningsCalendar(from, to);
    res.json({ from, to, count: data.length, events: data });
  } catch (err) {
    res
      .status(502)
      .json({ error: "Failed to fetch PSX earnings calendar", message: err.message });
  }
};

// GET /api/calendar/dividends
const getDividends = async (req, res) => {
  try {
    const data = await fetchDividends();
    res.json({ count: data.length, dividends: data });
  } catch (err) {
    res
      .status(502)
      .json({ error: "Failed to fetch PSX dividends", message: err.message });
  }
};

// GET /api/calendar/ipo
const getIpo = async (req, res) => {
  try {
    const data = await fetchListings();
    res.json({ count: data.length, listings: data });
  } catch (err) {
    res
      .status(502)
      .json({ error: "Failed to fetch PSX listings", message: err.message });
  }
};

module.exports = { getEarnings, getDividends, getIpo };
