const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  saveToWatchlist,
  getWatchlist,
} = require("../controllers/userController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.post("/save-watchlist", protect, saveToWatchlist);
router.get("/get-watchlist", protect, getWatchlist);

// Protected route example
router.get("/profile", protect, (req, res) => {
  const user = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone || null,
  };

  res.json({
    message: "Access granted to protected profile route",
    user,
  });
});

module.exports = router;
