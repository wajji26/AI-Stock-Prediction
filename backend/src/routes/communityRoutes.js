const express = require("express");
const { protect } = require("../middleware/authMiddleware.js");
const {
  listIdeas,
  getIdea,
  createIdea,
  boostIdea,
  addComment,
  deleteIdea,
} = require("../controllers/communityController.js");

const router = express.Router();

// public reads
router.get("/", listIdeas);
router.get("/:id", getIdea);

// authenticated writes
router.post("/", protect, createIdea);
router.post("/:id/boost", protect, boostIdea);
router.post("/:id/comments", protect, addComment);
router.delete("/:id", protect, deleteIdea);

module.exports = router;
