const mongoose = require("mongoose");

/* ================= TRIPLE PANNA ITEM ================= */
const starlineTriplePannaItemSchema = new mongoose.Schema({
  number: {
    type: String, // 000 - 999
    required: true,
    match: /^[0-9]{3}$/ // ensures exactly 3 digits
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  mode: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true
  }
});

/* ================= TRIPLE PANNA BET ================= */
const starlineTriplePannaBetSchema = new mongoose.Schema(
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
      default: "STARLINE",
      immutable: true
    },
    gameType: {
      type: String,
      default: "TRIPLE_PANNA",
      immutable: true
    },
    bets: {
      type: [starlineTriplePannaItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one triple panna bet required"
      ]
    },
    totalAmount: {
      type: Number,
      required: true
    },
    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING"
    },
    winningNumber: {
      type: String, // 000 - 999
      match: /^[0-9]{3}$/,
      default: null
    },
    playedDate: String,
    playedTime: String,
    playedWeekday: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("StarlineTriplePannaBet", starlineTriplePannaBetSchema);
