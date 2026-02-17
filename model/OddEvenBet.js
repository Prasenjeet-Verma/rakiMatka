const mongoose = require("mongoose");

/* ================= ODD EVEN ITEM ================= */
const oddEvenItemSchema = new mongoose.Schema({
  pattern: {
    type: String,
    enum: ["ODD", "EVEN"],
    required: true,
  },

  underNo: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]$/, "underNo must be single digit 0-9"],
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
  },

  winAmount: {
    type: Number,
    default: 0,
  },
  gameRateWinAmount: {
    type: Number,
    default: 0,
  },
  mode: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true,
  },

  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING",
  },
});

/* ================= ODD EVEN BET ================= */
const oddEvenBetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
    gameName: { type: String, required: true },

    mainGame: {
      type: String,
      default: "MAIN_GAME",
      immutable: true,
    },

    gameType: {
      type: String,
      default: "ODD_EVEN",
      immutable: true,
    },

    bets: {
      type: [oddEvenItemSchema],
      required: true,
    },

    beforeWallet: { type: Number, required: true },
    afterWallet: { type: Number, required: true },

    totalAmount: { type: Number, required: true },

    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("OddEvenBet", oddEvenBetSchema);
