const mongoose = require("mongoose");

/* ================= SINGLE PANNA ITEM ================= */
const singlePannaItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number,      // 0 - 9
    required: true,
    min: 0,
    max: 9
  },

underNo: {
  type: String,      // "127", "345"
  required: true,
  match: /^[0-9]{3}$/
},

  amount: {
    type: Number,
    required: true,
    min: 1
  }
});

/* ================= SINGLE PANNA BET ================= */
const singlePannaBetSchema = new mongoose.Schema(
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
      default: "SINGLE_PANNA",
      immutable: true
    },

    betType: {
      type: String,
      enum: ["open", "close"],
      required: true
    },

    bets: {
      type: [singlePannaItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one single panna bet required"
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

    winningPanna: {
      type: String,
      default: null
    },

    /* ================= INDIAN TIME ================= */
    playedDate: String,   // YYYY-MM-DD
    playedTime: String,   // HH:mm
    playedWeekday: String // Monday
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SinglePannaBet",
  singlePannaBetSchema
);
