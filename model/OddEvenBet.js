const mongoose = require("mongoose");

/* ================= ODD EVEN ITEM ================= */
const oddEvenItemSchema = new mongoose.Schema({
  pattern: {
    type: String, // "ODD" or "EVEN"
    enum: ["ODD", "EVEN"],
    required: true,
  },

  underNos: {
    type: [String], // ["127", "345", "569", ...] (odd/even ke andar wale)
    required: true,
    validate: [
      arr => arr.length > 0,
      "At least one under number required",
    ],
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
  },

  totalAmount: {
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
/* ================= ODD EVEN BET ================= */
const oddEvenBetSchema = new mongoose.Schema(
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
      default: "ODD_EVEN",
      immutable: true,
    },

    bets: {
      type: [oddEvenItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one odd-even panna bulk bet required",
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

    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true }
);
/* ===== PRE-SAVE HOOK: CALCULATE TOTAL AMOUNT ===== */
oddEvenBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0
  );
});
module.exports = mongoose.model(
  "OddEvenBet",
  oddEvenBetSchema
);
