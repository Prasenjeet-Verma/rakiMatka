const mongoose = require("mongoose");

/* ================= HALF SANGAM ITEM SCHEMA ================= */
const halfSangamItemSchema = new mongoose.Schema({
  session: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true,
  },
  openDigit: {
    type: Number,
    required: true,
  },
  closePanna: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
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
      immutable: true,
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

/* ===== PRE-SAVE HOOK (SAFE) ===== */
halfSangamBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0
  );
});

module.exports = mongoose.model("HalfSangamBet", halfSangamBetSchema);