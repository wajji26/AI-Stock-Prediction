const mongoose = require("mongoose");
const Portfolio = require("../models/Portfolio.js");
const { getLivePrice } = import("../services/stockService.js");
const { predictPrice } = require("../services/predictionService.js");

// Create new portfolio
const createPortfolio = async (req, res) => {
  try {
    const { stocks } = req.body; // stocks = [payload] from frontend

    if (!stocks || stocks.length === 0) {
      return res
        .status(400)
        .json({ message: "Please provide at least one stock" });
    }

    // For testing: use hardcoded ID if no user in request
    const userId = req.user._id;

    let portfolio = await Portfolio.findOne({ user: userId });

    // If no portfolio exists, create one
    if (!portfolio) {
      portfolio = new Portfolio({
        user: userId,
        stocks: [],
      });
    }

    stocks.forEach((incoming) => {
      const existing = portfolio.stocks.find(
        (s) => s.symbol === incoming.symbol,
      );

      if (existing) {
        // merge here
        existing.quantity += incoming.quantity;

        // optionally update other fields
        existing.buyPrice = incoming.buyPrice;
        existing.currentPrice = incoming.currentPrice;
        existing.logo = incoming.logo;
        existing.companyName = incoming.companyName;
      } else {
        portfolio.stocks.push(incoming);
      }
    });

    await portfolio.save();

    res
      .status(201)
      .json({ message: "Portfolio created or updated", portfolio });
  } catch (error) {
    console.error("Create portfolio error:", error);
    res.status(500).json({ message: error.message });
  }
};
// Get all portfolios of a user
//  const getPortfolios = async (req, res) => {
//   try {
//     const portfolios = await Portfolio.find({ user: req.user._id });
//     res.status(200).json(portfolios);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// Delete a portfolio
// DELETE /api/portfolio/stocks/:symbol
const deletePortfolio = async (req, res) => {
  try {
    const { symbol } = req.params;

    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const before = portfolio.stocks.length;

    portfolio.stocks = portfolio.stocks.filter(
      (s) => (s.symbol || "").toUpperCase() !== String(symbol).toUpperCase(),
    );

    if (portfolio.stocks.length === before) {
      return res.status(404).json({ message: "Stock not found in portfolio" });
    }

    await portfolio.save();

    return res.status(200).json({
      message: "Stock deleted successfully",
      portfolio,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPortfolioPerformance = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const portfolio = await Portfolio.findOne({ user: req.user._id });

    if (!portfolio || !portfolio.stocks || portfolio.stocks.length === 0) {
      return res.json({ portfolio: [] });
    }

    const results = [];

    // 2) Loop over saved stocks in DB
    for (const stock of portfolio.stocks) {
      // const live = await getLivePrice(stock.symbol); // your helper

      // const totalValue = stock.quantity * stock.currentPrice;
      // const invested = stock.quantity * stock.buyPrice;
      // const profitLoss = totalValue - invested;
      // const percentChange = ((profitLoss / invested) * 100).toFixed(2);

      results.push({
        logo: stock.logo,
        symbol: stock.symbol,
        companyName: stock.companyName,
        quantity: stock.quantity,
        buyPrice: stock.buyPrice,
        currentPrice: stock.currentPrice,
      });
    }

    // 3) Send response
    res.json({ portfolio: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching portfolio data" });
  }
};

const updateHoldings = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { payload } = req.body; // [{ symbol, quantity, buyPrice }]

    console.log(req.body);

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ message: "payload array is required" });
    }

    // sanitize
    const clean = payload
      .filter((s) => typeof s.symbol === "string" && s.symbol.trim())
      .map((s) => ({
        symbol: s.symbol.trim().toUpperCase(),
        quantity: Number(s.quantity) || 0,
        buyPrice: Number(s.buyPrice) || 0,
      }));

    // Build $set + arrayFilters for each symbol
    const setObj = {};
    const arrayFilters = [];

    clean.forEach((s, i) => {
      setObj[`stocks.$[s${i}].quantity`] = s.quantity;
      setObj[`stocks.$[s${i}].buyPrice`] = s.buyPrice;
      arrayFilters.push({ [`s${i}.symbol`]: s.symbol });
    });

    const updated = await Portfolio.findOneAndUpdate(
      { user: userId },
      { $set: setObj },
      { new: true, arrayFilters },
    );

    if (!updated)
      return res.status(404).json({ message: "Portfolio not found" });

    return res.json({ message: "Updated", portfolio: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getPortfolioPrediction = async (req, res) => {
  try {
    const { days = 7, modelType = "lstm" } = req.query;

    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const portfolio = await Portfolio.findOne({ user: req.user._id });

    if (!portfolio || !portfolio.stocks || portfolio.stocks.length === 0) {
      return res.json({
        currentTotal: 0,
        predictedTotal: 0,
        portfolio: [],
      });
    }

    let currentTotal = 0;
    let predictedTotal = 0;
    const results = [];

    // Process each stock
    // Use Promise.all to fetch predictions in parallel
    await Promise.all(
      portfolio.stocks.map(async (stock) => {
        try {
          const prediction = await predictPrice(
            stock.symbol,
            Number(days),
            modelType,
          );

          // Get the last predicted price (for the target day)
          // prediction.predictions is an array of { date, price }
          const lastPred =
            prediction.predictions[prediction.predictions.length - 1];
          const predictedPrice = lastPred ? lastPred.price : stock.currentPrice;

          const stockValue = stock.quantity * stock.currentPrice;
          const predictedStockValue = stock.quantity * predictedPrice;

          currentTotal += stockValue;
          predictedTotal += predictedStockValue;

          results.push({
            symbol: stock.symbol,
            quantity: stock.quantity,
            currentPrice: stock.currentPrice,
            predictedPrice: predictedPrice,
            currentValue: stockValue,
            predictedValue: predictedStockValue,
            predictionData: prediction.predictions, // Include full trend
          });
        } catch (error) {
          console.error(
            `Prediction failed for ${stock.symbol}:`,
            error.message,
          );
          // Fallback to current price if prediction fails
          const stockValue = stock.quantity * stock.currentPrice;
          currentTotal += stockValue;
          predictedTotal += stockValue; // Assume no change on error

          results.push({
            symbol: stock.symbol,
            quantity: stock.quantity,
            currentPrice: stock.currentPrice,
            predictedPrice: stock.currentPrice,
            currentValue: stockValue,
            predictedValue: stockValue,
            error: "Prediction unavailable",
          });
        }
      }),
    );

    res.json({
      currentTotal,
      predictedTotal,
      portfolio: results,
    });
  } catch (err) {
    console.error("Portfolio prediction error:", err);
    res.status(500).json({ message: "Error calculating portfolio prediction" });
  }
};

module.exports = {
  createPortfolio,
  deletePortfolio,
  getPortfolioPerformance,
  updateHoldings,
  getPortfolioPrediction,
};
