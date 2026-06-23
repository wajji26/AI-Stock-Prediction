const express = require("express");
const {
  getEarnings,
  getDividends,
  getIpo,
} = require("../controllers/calendarController.js");

const router = express.Router();

router.get("/earnings", getEarnings);
router.get("/dividends", getDividends);
router.get("/ipo", getIpo);

module.exports = router;
