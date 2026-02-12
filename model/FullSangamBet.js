const mongoose = require("mongoose");

/* ================= FULL SANGAM ITEM SCHEMA ================= */
const fullSangamItemSchema = new mongoose.Schema({
  openPanna: {
    type: String,
    required: true,
    match: /^\d{3}$/,
  },
  closePanna: {
    type: String,
    required: true,
    match: /^\d{3}$/,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 1,
  },
    winAmount: {
    type: Number,
    default: 0,
  },
  // 🔥 ADD THIS HERE (ITEM LEVEL)
  openMatched: {
    type: Boolean,
    default: false,
  },
  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING",
  },
});

/* ================= FULL SANGAM BET SCHEMA ================= */
const fullSangamBetSchema = new mongoose.Schema(
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
      default: "FULL_SANGAM",
      immutable: true,
    },
    bets: {
      type: [fullSangamItemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "At least one bet required"],
    },
    totalAmount: {
      type: Number,
      required: true,
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

    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true },
);

/* ===== PRE-SAVE HOOK (SAFE) ===== */
fullSangamBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0,
  );
});

module.exports = mongoose.model("FullSangamBet", fullSangamBetSchema);
