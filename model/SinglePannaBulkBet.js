const mongoose = require("mongoose");

/* ================= SINGLE PANNA BULK ITEM ================= */
const singlePannaBulkItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number, // 0 - 9
    required: true,
    min: 0,
    max: 9,
  },
  underNo: {
    type: String, // "127", "345"
    required: true,
    match: /^[0-9]{3}$/,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  mode: {
    type: String, // "OPEN" or "CLOSE"
    enum: ["OPEN", "CLOSE"],
    required: true,
  },
});

/* ================= SINGLE PANNA BULK BET ================= */
const singlePannaBulkBetSchema = new mongoose.Schema(
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

    gameName: {
      type: String,
      required: true,
    },

    gameType: {
      type: String,
      default: "SINGLE_PANNA_BULK",
      immutable: true,
    },

    bets: {
      type: [singlePannaBulkItemSchema],
      required: true,
      validate: [
        (arr) => arr.length > 0,
        "At least one single panna bulk bet required",
      ],
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING",
    },

    winningPanna: {
      type: String,
      default: null,
    },

    playedDate: String, // YYYY-MM-DD
    playedTime: String, // HH:mm
    playedWeekday: String, // Monday
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SinglePannaBulkBet",
  singlePannaBulkBetSchema
);
