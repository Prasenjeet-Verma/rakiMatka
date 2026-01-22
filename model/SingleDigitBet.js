const mongoose = require("mongoose");

/* ================= SINGLE DIGIT ITEM ================= */
const singleDigitItemSchema = new mongoose.Schema({
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

/* ================= SINGLE DIGIT BET ================= */
const singleDigitBetSchema = new mongoose.Schema(
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
      default: "SINGLE_DIGIT",
      immutable: true // ❗ change hi nahi ho sakta
    },

    betType: {
      type: String,
      enum: ["open", "close"],
      required: true
    },

    bets: {
      type: [singleDigitItemSchema],
      validate: [
        arr => arr.length > 0,
        "At least one single digit bet required"
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
  "SingleDigitBet",
  singleDigitBetSchema
);
