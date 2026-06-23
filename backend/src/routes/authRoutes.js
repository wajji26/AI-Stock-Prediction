const express = require("express");
const { startOAuth, oauthCallback } = require("../controllers/authController.js");

const router = express.Router();

// OAuth: app opens /api/auth/google or /api/auth/discord in a browser.
router.get("/:provider", startOAuth);
router.get("/:provider/callback", oauthCallback);

module.exports = router;
