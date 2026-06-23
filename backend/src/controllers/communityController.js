const jwt = require("jsonwebtoken");
const Idea = require("../models/Idea.js");
const { User } = require("../models/User.js");

const AUTHOR_FIELDS = "name avatar";

// Optionally resolve the current user id from a Bearer token without
// rejecting unauthenticated requests (feed is public, but we want to know
// whether *you* boosted an idea).
function optionalUserId(req) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return null;
    const decoded = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET);
    return decoded.id || null;
  } catch {
    return null;
  }
}

// Shape an Idea document for the client (counts instead of raw arrays).
function shapeIdea(doc, meId) {
  const boosts = doc.boosts || [];
  return {
    id: doc._id,
    symbol: doc.symbol,
    companyName: doc.companyName || null,
    title: doc.title,
    body: doc.body || "",
    side: doc.side,
    editorsPick: doc.editorsPick,
    author: doc.author
      ? { id: doc.author._id, name: doc.author.name, avatar: doc.author.avatar }
      : null,
    boostCount: boosts.length,
    boostedByMe: meId
      ? boosts.some((b) => String(b) === String(meId))
      : false,
    commentCount: (doc.comments || []).length,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// GET /api/ideas?sort=popular|recent&filter=all|editors&symbol=LUCK
const listIdeas = async (req, res) => {
  try {
    const meId = optionalUserId(req);
    const { sort = "popular", filter = "all", symbol } = req.query;

    const q = {};
    if (filter === "editors") q.editorsPick = true;
    if (symbol) q.symbol = String(symbol).toUpperCase();

    let ideas = await Idea.find(q)
      .populate("author", AUTHOR_FIELDS)
      .select("-comments.text") // counts only; full comments come from getIdea
      .lean();

    ideas = ideas.map((d) => shapeIdea(d, meId));

    if (sort === "recent") {
      ideas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      // popular: boosts first, then comments, then recency
      ideas.sort(
        (a, b) =>
          b.boostCount - a.boostCount ||
          b.commentCount - a.commentCount ||
          new Date(b.createdAt) - new Date(a.createdAt),
      );
    }

    res.json({ count: ideas.length, ideas });
  } catch (err) {
    console.error("listIdeas error:", err);
    res.status(500).json({ message: "Failed to load ideas" });
  }
};

// GET /api/ideas/:id  (public) — full idea with comments
const getIdea = async (req, res) => {
  try {
    const meId = optionalUserId(req);
    const idea = await Idea.findById(req.params.id)
      .populate("author", AUTHOR_FIELDS)
      .populate("comments.author", AUTHOR_FIELDS)
      .lean();

    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const shaped = shapeIdea(idea, meId);
    shaped.comments = (idea.comments || [])
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((c) => ({
        id: c._id,
        text: c.text,
        createdAt: c.createdAt,
        author: c.author
          ? { id: c.author._id, name: c.author.name, avatar: c.author.avatar }
          : null,
      }));

    res.json({ idea: shaped });
  } catch (err) {
    console.error("getIdea error:", err);
    res.status(500).json({ message: "Failed to load idea" });
  }
};

// POST /api/ideas  (protected)
const createIdea = async (req, res) => {
  try {
    const { symbol, companyName, title, body, side } = req.body;
    if (!symbol || !title) {
      return res
        .status(400)
        .json({ message: "symbol and title are required" });
    }

    const idea = await Idea.create({
      author: req.user._id,
      symbol: String(symbol).toUpperCase(),
      companyName,
      title,
      body,
      side: ["long", "short", "neutral"].includes(side) ? side : "neutral",
    });

    await idea.populate("author", AUTHOR_FIELDS);
    res.status(201).json({ idea: shapeIdea(idea.toObject(), req.user._id) });
  } catch (err) {
    console.error("createIdea error:", err);
    res.status(500).json({ message: "Failed to create idea" });
  }
};

// POST /api/ideas/:id/boost  (protected) — toggle
const boostIdea = async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const me = String(req.user._id);
    const has = idea.boosts.some((b) => String(b) === me);
    if (has) {
      idea.boosts = idea.boosts.filter((b) => String(b) !== me);
    } else {
      idea.boosts.push(req.user._id);
    }
    await idea.save();

    res.json({ boostCount: idea.boosts.length, boosted: !has });
  } catch (err) {
    console.error("boostIdea error:", err);
    res.status(500).json({ message: "Failed to boost idea" });
  }
};

// POST /api/ideas/:id/comments  (protected)
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    idea.comments.push({ author: req.user._id, text: text.trim() });
    await idea.save();

    const added = idea.comments[idea.comments.length - 1];
    res.status(201).json({
      comment: {
        id: added._id,
        text: added.text,
        createdAt: added.createdAt,
        author: {
          id: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
        },
      },
      commentCount: idea.comments.length,
    });
  } catch (err) {
    console.error("addComment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// DELETE /api/ideas/:id  (protected) — author only
const deleteIdea = async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    if (String(idea.author) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your idea" });
    }
    await idea.deleteOne();
    res.json({ message: "Idea deleted", id: req.params.id });
  } catch (err) {
    console.error("deleteIdea error:", err);
    res.status(500).json({ message: "Failed to delete idea" });
  }
};

module.exports = {
  listIdeas,
  getIdea,
  createIdea,
  boostIdea,
  addComment,
  deleteIdea,
};
