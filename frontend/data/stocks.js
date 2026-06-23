// Minimal mock + drop-in API adapter.
// Later: replace fetchStocks(...) with a real HTTP call.
import { API_URL } from "../config/config";
import { stocksData } from "./stocksData.js";

// const SAMPLE = [
//   {
//     logo: "https://logo.clearbit.com/apple.com",
//     name: "Apple",
//     ticker: "AAPL",
//     price: 228.54,
//     pct: -0.64,
//     vol: "12.8B",
//   },
//   {
//     logo: "https://logo.clearbit.com/nvidia.com",
//     name: "NVIDIA",
//     ticker: "NVDA",
//     price: 123.88,
//     pct: 3.35,
//     vol: "18.3B",
//   },
//   {
//     logo: "https://logo.clearbit.com/tesla.com",
//     name: "Tesla",
//     ticker: "TSLA",
//     price: 254.02,
//     pct: -3.07,
//     vol: "9.1B",
//   },
//   {
//     logo: "https://logo.clearbit.com/microsoft.com",
//     name: "Microsoft",
//     ticker: "MSFT",
//     price: 425.62,
//     pct: 10.29,
//     vol: "7.4B",
//   },
//   {
//     logo: "https://logo.clearbit.com/google.com",
//     name: "Alphabet",
//     ticker: "GOOGL",
//     price: 177.4,
//     pct: -4.26,
//     vol: "6.2B",
//   },
//   {
//     logo: "https://logo.clearbit.com/ethereum.org",
//     name: "Ethereum ETF",
//     ticker: "ETH",
//     price: 3545.62,
//     pct: -0.99,
//     vol: "5.3B",
//   },
// ];

// for backend API later

// export async function fetchStocks(params) {
//   const qs = new URLSearchParams(params).toString();
//   const res = await fetch(`http://localhost:6000/api/stocks?exchange=US&${qs}`);
//   console.log(res);
//   return await res.json();
// }

// mock implementation for now
let cachedStocks = null;

export async function fetchStocks({ topTab = "Favorites", q = "", token, force = false }) {
  // Load real backend data if not loaded yet (or if forcing a refresh)
  if (force) cachedStocks = null;
  if (!cachedStocks) {
    const res = await fetch(`${API_URL}/api/stocks/psx-kse30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    cachedStocks = result; // <--- only the data array, not the full object
  }

  if (!cachedStocks || !Array.isArray(cachedStocks)) {
    return []; // safety fallback
  }

  let rows = [...cachedStocks];

  // simple UI filters
  if (topTab === "Gainers") {
    rows = [...rows]
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);
  }

  if (topTab === "Pre-Market") {
    rows = rows.filter((x) => ["AAPL", "MSFT"].includes(x.symbol));
  }

  if (q) {
    rows = rows.filter((x) =>
      (x.name + x.symbol).toLowerCase().includes(q.toLowerCase()),
    );
  }

  return rows;
}

export async function fetchAllStocks(token) {
  const res = await fetch(`${API_URL}/api/stocks/psx-kse30`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await res.json();
  return result;
  // await new Promise((r) => setTimeout(r, 150));
  // return stocksData;
}
