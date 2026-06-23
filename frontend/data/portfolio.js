import { API_URL } from "../config/config";

export async function fetchPortfolio(token) {
  try {
    const res = await fetch(`${API_URL}/api/portfolio`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch portfolio");
    }

    if (!data.portfolio || data.portfolio.length === 0) {
      return {
        positions: [],
        summary: {
          totalInvested: 0,
          currentValue: 0,
          pl: 0,
          plPercent: 0,
        },
        distribution: [],
        predictions: [],
      };
    }

    // Convert backend shape → frontend UI shape
    const positions = data.portfolio.map((s) => ({
      symbol: s.symbol,
      name: s.companyName,
      quantity: s.quantity,
      avgPrice: s.buyPrice,
      currentPrice: s.currentPrice,
    }));

    // Calculate summary + distribution
    let invested = 0;
    let current = 0;

    positions.forEach((pos) => {
      invested += pos.quantity * pos.avgPrice;
      current += pos.quantity * pos.currentPrice;
    });

    const summary = {
      totalInvested: invested,
      currentValue: current,
      pl: current - invested,
      plPercent: invested ? ((current - invested) / invested) * 100 : 0,
    };

    const distribution = positions.map((pos) => ({
      symbol: pos.symbol,
      value: pos.quantity * pos.currentPrice,
    }));

    return {
      positions,
      summary,
      distribution,
      predictions: [], // Fill once backend provides real predictions
    };
  } catch (err) {
    console.log("Portfolio fetch error:", err);
    throw err;
  }
}
