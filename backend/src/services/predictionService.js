const axios = require("axios");

// Get the Python API URL from environment variables or use default
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:8001";

/**
 * Fetches stock price predictions from the dedicated Python AI service.
 * @param {string} symbol - The stock symbol (e.g., AAPL).
 * @param {number} days - Number of days to predict (default 7).
 * @param {string} modelType - The model to use ('lstm' or 'prophet').
 * @returns {Promise<Object>} - The prediction result.
 */
async function predictPrice(symbol, days = 7, modelType = "lstm") {
  try {
    const response = await axios.post(
      `${PYTHON_API_URL}/prediction`,
      { symbol, days, model_type: modelType },
      { timeout: 90000 }, // 90s, covers Render free-tier cold starts
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error in prediction service:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.detail ||
        "Failed to fetch predictions from AI service"
    );
  }
}

module.exports = { predictPrice };
