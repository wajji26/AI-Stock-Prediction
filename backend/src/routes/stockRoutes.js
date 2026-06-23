const express = require("express");
const {
  getStockPrice,
  getStocksList,
  getStockCandles,
  getPSXStocks,
  getSinglePSXStock,
  getPSXStockHistory,
  getKSE30Stocks,
} = require("../controllers/stockController.js");

const router = express.Router();

router.get("/chart/:symbol", getStockCandles);

router.get("/price/:symbol", getStockPrice);
router.get("/psx", getPSXStocks);
router.get("/psx/:symbol", getSinglePSXStock);
router.get("/psx/:symbol/history", getPSXStockHistory);
router.get("/psx-kse30", getKSE30Stocks);
router.get("/", getStocksList);

module.exports = router;
