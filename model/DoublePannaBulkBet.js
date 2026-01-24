const mongoose = require("mongoose");

/* ================= SINGLE PANNA BULK ITEM ================= */
const doublePannaBulkItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number, // 0 - 9
    required: true,
    min: 0,
    max: 9,
  },
  underNos: {
    type: [String], // ["127", "134", "445", ...]
    required: true,
    validate: [arr => arr.length > 0, "At least one under number required"],
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

/* ================= SINGLE PANNA BULK BET ================= */
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
    gameType: {
      type: String,
      default: "DOUBLE_PANNA_BULK",
      immutable: true,
    },
    bets: {
      type: [doublePannaBulkItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one double panna bulk bet required",
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
    playedDate: String, // YYYY-MM-DD
    playedTime: String, // HH:mm
    playedWeekday: String, // Monday
  },
  { timestamps: true }
);

/* ===== PRE-SAVE HOOK: CALCULATE TOTAL AMOUNT ===== */
doublePannaBulkBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0
  );
});


module.exports = mongoose.model(
  "DoublePannaBulkBet",
  doublePannaBulkBetSchema
);
