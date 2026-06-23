const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // password is only required for local (email/password) accounts.
    // OAuth accounts (Google/Discord) have no password.
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    provider: {
      type: String,
      enum: ["local", "google", "discord"],
      default: "local",
    },
    googleId: { type: String, default: null },
    discordId: { type: String, default: null },
    avatar: { type: String, default: null },
    watchlist: {
      type: [
        {
          symbol: { type: String, required: true, uppercase: true, trim: true },

          // snapshot fields you want to store
          name: { type: String, default: null },
          logo: { type: String, default: null },
          price: { type: Number, default: null },
          changePercent: { type: Number, default: null },

          // timestamps
          addedAt: { type: Date, default: Date.now },
          lastSyncedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
