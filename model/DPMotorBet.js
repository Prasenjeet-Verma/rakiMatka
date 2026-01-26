const mongoose = require("mongoose");

/* ================= SP MOTOR ITEM SCHEMA ================= */
const dpMotorItemSchema = new mongoose.Schema({
  session: {
    type: String,           // "OPEN" or "CLOSE"
    enum: ["OPEN", "CLOSE"],
    required: true,
  },
  openDigit: {
    type: Number,           // user input digit
    required: true,
  },
  points: {
    type: Number,           // user points
    required: true,
    min: 1,
  },
  totalAmount: {
    type: Number,           // same as points
    required: true,
    min: 1,
  },
});

/* ================= DP MOTOR BET SCHEMA ================= */
const dpMotorBetSchema = new mongoose.Schema(
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
      default: "SP_MOTOR",
      immutable: true,
    },
    bets: {
      type: [dpMotorItemSchema],
      required: true,
      validate: [arr => arr.length > 0, "At least one bet required"],
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
    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true }
);

/* ===== PRE-SAVE HOOK: CALCULATE TOTAL AMOUNT ===== */
dpMotorBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce(
    (sum, b) => sum + (b.totalAmount || b.points || 0),
    0
  );
});

module.exports = mongoose.model("DPMotorBet", dpMotorBetSchema);
