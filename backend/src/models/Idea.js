const mongoose = require("mongoose");

// A community "idea" = a user-posted trade thesis about a PSX symbol.
// The card's chart is rendered live on the client from the symbol, so we
// store no images here — just the symbol + the author's analysis.
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

const ideaSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    companyName: { type: String, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, trim: true, maxlength: 5000 },
    // direction of the thesis — drives the bull/bear chip + chart color
    side: {
      type: String,
      enum: ["long", "short", "neutral"],
      default: "neutral",
    },
    // users who boosted (rocket). Count = length; uniqueness enforced in code.
    boosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    editorsPick: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ideaSchema.index({ createdAt: -1 });
ideaSchema.index({ symbol: 1 });

module.exports = mongoose.model("Idea", ideaSchema);
