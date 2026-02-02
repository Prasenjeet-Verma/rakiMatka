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
  },
  mode: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true
  },
      resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING"
    },
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
        mainGame: {
      type: String,
      default: "MAIN_GAME",
      immutable: true
    },
    gameType: {
      type: String,
      default: "SINGLE_BULK_DIGIT",
      immutable: true
    },
    bets: {
      type: [bulkDigitItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one bulk digit bet required"
      ]
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
      required: true
    },

    winningNumber: {
      type: Number,
      min: 0,
      max: 9,
      default: null
    },
    playedDate: String,
    playedTime: String,
    playedWeekday: String
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SingleBulkDigitBet",
  singleBulkDigitBetSchema
);
