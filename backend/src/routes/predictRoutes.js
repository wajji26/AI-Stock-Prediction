const express = require("express");
const {
  predictPriceController,
  getPrediction
} = require("../controllers/predictionController");

const router = express.Router();

router.post("/:ticker", predictPriceController);

router.get("/:symbol", getPrediction); // Added route
module.exports = router;
