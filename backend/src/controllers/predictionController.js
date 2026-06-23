const { predictPrice } = require("../services/predictionService.js");

const predictPriceController = async (req, res) => {
  const { ticker } = req.params;
  const days = parseInt(req.query.days, 10) || 7;
  const modelType = (req.query.modelType || "lstm").toLowerCase();

  if (!["lstm", "prophet"].includes(modelType)) {
    return res.status(400).json({ error: `Unsupported modelType: ${modelType}` });
  }

  try {
    const data = await predictPrice(ticker.toUpperCase(), days, modelType);
    res.json(data);
  } catch (err) {
    console.error("Prediction error:", err.message);
    res.status(502).json({ error: err.message });
  }
};

const getPrediction = async (req, res) => {
  const { symbol } = req.params;
  const { days = 7, model = "lstm" } = req.query;

  if (!symbol) {
    return res.status(400).json({ message: "Stock symbol is required" });
  }

  try {
    const data = await predictPrice(symbol.toUpperCase(), parseInt(days), model);
    res.json(data);
  } catch (err) {
    console.error("Prediction Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
module.exports = { predictPriceController , getPrediction,
 };
