const mongoose = require("mongoose");

/* ================= DOUBLE PANNA BULK ITEM ================= */
const doublePannaBulkItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number, // 0 - 9
    required: true,
    min: 0,
    max: 9,
  },
  underNo: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{3}$/, "underNo must be exactly 3 digits"],
  },
  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
  },
  mode: {
    type: String, // "OPEN" or "CLOSE"
    enum: ["OPEN", "CLOSE"],
    required: true,
  },
  winAmount: {
    type: Number,
    default: 0,
  },
    gameRateWinAmount: {
    type: Number,
    default: 0,
  },
  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING",
  },
});

/* ================= DOUBLE PANNA BULK BET ================= */
const doublePannaBulkBetSchema = new mongoose.Schema(
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
    mainGame: {
      type: String,
      default: "MAIN_GAME",
      immutable: true,
    },
    gameType: {
      type: String,
      default: "DOUBLE_PANNA_BULK",
      immutable: true,
    },
    bets: {
      type: [doublePannaBulkItemSchema],
      required: true,
      validate: [
        (arr) => arr.length > 0,
        "At least one double panna bulk bet required",
      ],
    },
    beforeWallet: {
      type: Number,
      required: true,
      min: 1,
    },
    afterWallet: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    winningPanna: {
      type: String,
      default: null,
    },
    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoublePannaBulkBet", doublePannaBulkBetSchema);
