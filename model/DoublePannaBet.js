const mongoose = require("mongoose");

/* ================= DOUBLE PANNA ITEM ================= */
const doublePannaItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number, // 0 - 9
    required: true,
    min: 0,
    max: 9
  },

  underNo: {
    type: String, // "337"
    required: true,
    match: /^[0-9]{3}$/
  },

  amount: {
    type: Number,
    required: true,
    min: 1
  },

  /* 🔥 IMPORTANT (OPEN / CLOSE per panna) */
  mode: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true
  }
});

/* ================= DOUBLE PANNA BET ================= */
const doublePannaBetSchema = new mongoose.Schema(
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
    mainGame: {
      type: String,
      default: "MAIN_GAME",
      immutable: true
    },
    /* 🔒 FIXED GAME TYPE */
    gameType: {
      type: String,
      default: "DOUBLE_PANNA",
      immutable: true
    },

    /* 🔥 REMOVE betType (not needed here) */
    bets: {
      type: [doublePannaItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one double panna bet required"
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
  "DoublePannaBet",
  doublePannaBetSchema
);
