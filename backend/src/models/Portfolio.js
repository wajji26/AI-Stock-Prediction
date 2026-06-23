const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stocks: [
      {
        logo: { type: String },
        symbol: { type: String, required: true },
        companyName: { type: String },
        quantity: { type: Number, required: true },
        buyPrice: { type: Number, required: true },
        currentPrice: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
