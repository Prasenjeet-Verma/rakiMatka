const mongoose = require("mongoose");

/* ================= BULK DIGIT ITEM ================= */
const bulkDigitItemSchema = new mongoose.Schema({
  number: {
    type: Number,
    min: 0,
    max: 9,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  }
});

/* ================= SINGLE BULK DIGIT BET ================= */
const singleBulkDigitBetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true
    },

    gameName: {
      type: String,
      required: true
    },

    /* 🔒 FIXED GAME TYPE */
    gameType: {
      type: String,
      default: "SINGLE_BULK_DIGIT",
      immutable: true
    },

    session: {
      type: String,
      enum: ["OPEN", "CLOSE"],
      required: true
    },

    bets: {
      type: [bulkDigitItemSchema],
       required: true,
      validate: [
        arr => arr.length > 0,
        "At least one bulk digit bet required"
      ]
    },

    totalAmount: {
      type: Number,
      required: true
    },

    /* ================= RESULT ================= */
    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING"
    },

    winningNumber: {
      type: Number,
      min: 0,
      max: 9,
      default: null
    },

    /* ================= INDIAN TIME ================= */
    playedDate: {
      type: String // YYYY-MM-DD
    },

    playedTime: {
      type: String // HH:mm
    },

    playedWeekday: {
      type: String // Monday
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SingleBulkDigitBet",
  singleBulkDigitBetSchema
);
