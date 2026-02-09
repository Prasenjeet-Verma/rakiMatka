const mongoose = require("mongoose");

/* ================= SINGLE PANNA BULK ITEM ================= */
const singlePannaBulkItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number,
    required: true,
    min: 0,
    max: 9,
  },

  underNo: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{3}$/, "underNo must be exactly 3 digits"], // 000 allowed
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
  },

  mode: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true,
  },

  winAmount: {
    type: Number,
    default: 0,
  },
  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING",
  },
});

/* ================= SINGLE PANNA BULK BET ================= */
const singlePannaBulkBetSchema = new mongoose.Schema(
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
      default: "SINGLE_PANNA_BULK",
      immutable: true,
    },

    bets: {
      type: [singlePannaBulkItemSchema],
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

module.exports = mongoose.model(
  "SinglePannaBulkBet",
  singlePannaBulkBetSchema
);
