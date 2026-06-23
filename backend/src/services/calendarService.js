// calendarService.js
// Fetches real PSX corporate-calendar data from the official PSX Data Portal
// (dps.psx.com.pk). Three sources power the app's Calendar screen:
//   - Earnings/Meetings : POST /calendar      (JSON: AGM/EOGM/board meetings)
//   - Dividends         : POST /payouts       (HTML table, parsed with cheerio)
//   - IPO / Listings    : GET  /listings-table/main/nc (HTML table, parsed)
//
// All requests go through DOSarrest, so we send browser-like headers. Results
// are cached in-memory (TTL) to stay polite and keep the screen snappy.

const axios = require("axios");
const cheerio = require("cheerio");

const PSX_BASE = "https://dps.psx.com.pk";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: PSX_BASE + "/",
};

// ---- tiny in-memory cache -------------------------------------------------
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map(); // key -> { ts, data }

function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
  return null;
}
function setCached(key, data) {
  cache.set(key, { ts: Date.now(), data });
  return data;
}

// ---- helpers --------------------------------------------------------------
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

// Format a Date as YYYY-MM-DD (UTC-safe, no locale surprises).
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// =====================================================================
// 1) EARNINGS / CORPORATE MEETINGS  -> POST /calendar  (returns JSON)
// =====================================================================
// PSX companies announce financial results at board meetings / AGMs / EOGMs.
// The portal's FullCalendar feed returns these as structured JSON.
async function fetchEarningsCalendar(from, to) {
  const key = `earnings:${from}:${to}`;
  const cached = getCached(key);
  if (cached) return cached;

  const body = new URLSearchParams({ from, to }).toString();
  const { data } = await axios.post(`${PSX_BASE}/calendar`, body, {
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: `${PSX_BASE}/`,
    },
    timeout: 20000,
  });

  const rows = Array.isArray(data?.data) ? data.data : [];
  const events = rows.map((e) => ({
    id: e.id,
    symbol: clean(e.symbol),
    company: clean(e.name),
    type: clean(e.type), // AGM | EOGM | BM (board meeting)
    date: e.date, // YYYY-MM-DD
    time: e.time || null, // HH:mm
    city: clean(e.city) || null,
    periodEnd: e.period_end || null, // financial period the meeting covers
  }));

  // newest meetings first within the range
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return setCached(key, events);
}

// =====================================================================
// 2) DIVIDENDS / PAYOUTS  -> POST /payouts  (HTML table -> cheerio)
// =====================================================================
async function fetchDividends() {
  const key = "dividends";
  const cached = getCached(key);
  if (cached) return cached;

  // count is large so we get the full active payout list in one shot.
  const body = new URLSearchParams({
    symbol: "",
    year: String(new Date().getFullYear()),
    count: "500",
    offset: "0",
  }).toString();

  const { data: html } = await axios.post(`${PSX_BASE}/payouts`, body, {
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: `${PSX_BASE}/payouts`,
    },
    timeout: 20000,
  });

  const $ = cheerio.load(html);
  const out = [];
  $("table#announcementsTable tbody tr, table.tbl tbody tr").each((_, tr) => {
    const td = $(tr).find("td");
    if (td.length < 6) return;
    const symbol = clean($(td[0]).text());
    if (!symbol) return;
    out.push({
      symbol,
      company: clean($(td[1]).text()),
      sector: clean($(td[2]).text()),
      payout: clean($(td[3]).text()), // e.g. "109%(F) (D)"
      announcedAt: clean($(td[4]).text()), // "June 18, 2026 3:52 PM"
      bookClosure: clean($(td[5]).text()), // "21/07/2026 - 28/07/2026"
    });
  });

  return setCached(key, out);
}

// =====================================================================
// 3) IPO / NEW LISTINGS  -> GET /listings-table/main/nc  (HTML -> cheerio)
// =====================================================================
async function fetchListings() {
  const key = "listings";
  const cached = getCached(key);
  if (cached) return cached;

  const { data: html } = await axios.get(
    `${PSX_BASE}/listings-table/main/nc`,
    {
      headers: { ...BROWSER_HEADERS, Referer: `${PSX_BASE}/listings` },
      timeout: 20000,
    },
  );

  const $ = cheerio.load(html);
  const out = [];
  $("table.tbl tbody tr").each((_, tr) => {
    const td = $(tr).find("td");
    if (td.length < 7) return;
    const symbol = clean($(td[0]).text());
    if (!symbol) return;
    out.push({
      symbol,
      company: clean($(td[1]).text()),
      sector: clean($(td[2]).text()),
      clearingType: clean($(td[3]).text()),
      shares: clean($(td[4]).text()),
      freeFloat: clean($(td[5]).text()),
      listedIn: clean($(td[6]).text()),
    });
  });

  return setCached(key, out);
}

module.exports = {
  fetchEarningsCalendar,
  fetchDividends,
  fetchListings,
  ymd,
};
