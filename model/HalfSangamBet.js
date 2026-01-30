const mongoose = require("mongoose");

/* ================= HALF SANGAM ITEM SCHEMA ================= */
const halfSangamItemSchema = new mongoose.Schema({
  session: {
    type: String,           // "OPEN" or "CLOSE"
    enum: ["OPEN", "CLOSE"],
    required: true,
  },
  openDigit: {
    type: Number,           // koi bhi number allowed
    required: true,
  },
  closePanna: {
    type: Number,           // koi bhi number allowed
    required: true,
  },
  amount: {
    type: Number,           // user ka bet amount
    required: true,
    min: 1,                 // amount 1 se kam nahi ho sakta
  },
  totalAmount: {
    type: Number,           // same as amount for now, pre-save hook handle karega
    required: true,
    min: 1,
  },
});

/* ================= HALF SANGAM BET SCHEMA ================= */
const halfSangamBetSchema = new mongoose.Schema(
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
      immutable: true
    },
    gameType: {
      type: String,
      default: "HALF_SANGAM",
      immutable: true,
    },
    bets: {
      type: [halfSangamItemSchema],
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
halfSangamBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);
});

module.exports = mongoose.model("HalfSangamBet", halfSangamBetSchema);
