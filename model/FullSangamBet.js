const mongoose = require("mongoose");

/* ========== SINGLE FULL SANGAM BID ITEM ========== */
const fullSangamBidItemSchema = new mongoose.Schema(
  {
openPana: {
  type: String,
  required: true,
  match: /^\d+$/   // only digits, any length
},
closePana: {
  type: String,
  required: true,
  match: /^\d+$/   // only digits, any length
},

    points: {
      type: Number,
      required: true,
      min: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    playedDate: {
      type: String,
      required: true,
    },

    playedTime: {
      type: String,
      required: true,
    },

    playedWeekday: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

/* ========== FULL SANGAM SUBMIT SCHEMA ========== */
const fullSangamSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    mainGame: {
      type: String,
      default: "MAIN_GAME",
      immutable: true
    },
    gameType: {
      type: String,
      default: "FULL_SANGAM",
      immutable: true,
    },

    totalBids: {
      type: Number,
      required: true,
      min: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    bids: {
      type: [fullSangamBidItemSchema],
      validate: v => v.length > 0,
    },

    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSE"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FullSangam", fullSangamSchema);
