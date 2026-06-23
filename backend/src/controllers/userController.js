const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User.js");
const {
  getCompanyProfile,
  getLivePrice,
  fetchSingleStock,
} = require("../services/stockService.js");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword });
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Welcome to AI Stock Prediction!",
      text: `Welcome ${name}! You have successfully registered.`,
    });
    res
      .status(201)
      .json({ message: "User registered successfully", user, status: 200 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    console.log(user);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // return user without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
    };

    return res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const saveToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    const normalizedSymbol = symbol.toUpperCase().trim();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = user.watchlist.findIndex(
      (item) => item.symbol === normalizedSymbol
    );

    // ✅ If already exists -> remove (toggle behavior)
    if (index !== -1) {
      user.watchlist.splice(index, 1);
      await user.save();

      return res.status(200).json({
        message: "Stock removed from watchlist",
        watchlist: user.watchlist,
      });
    }

    // ✅ If not exists -> fetch the PSX snapshot once and store it.
    // (These are PSX tickers, so use the PSX/TradingView source, not Finnhub.)
    const stock = await fetchSingleStock(normalizedSymbol);

    // If the source fails, don't save an empty/garbage row.
    if (!stock) {
      return res.status(502).json({
        message: `Failed to fetch stock data for ${normalizedSymbol}`,
      });
    }

    const watchlistItem = {
      symbol: normalizedSymbol,
      name: stock.name || normalizedSymbol,
      logo: stock.logo || null,
      price: stock.price ?? null,
      changePercent: stock.changePercent ?? null,
      addedAt: new Date(),
      lastSyncedAt: new Date(),
    };

    user.watchlist.push(watchlistItem);
    await user.save();

    return res.status(200).json({
      message: "Stock added to watchlist",
      watchlist: user.watchlist,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET: return full stock data for the current user's watchlist
const getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("watchlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ watchlist: user.watchlist });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// routes: router.post("/logout", logoutUser);
const logoutUser = (req, res) => {
  return res.status(200).json({ message: "Logged out" });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  saveToWatchlist,
  getWatchlist,
};
