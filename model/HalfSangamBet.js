const mongoose = require("mongoose");

/* ================= HALF SANGAM ITEM SCHEMA ================= */
const halfSangamItemSchema = new mongoose.Schema({
  // OPEN PANNA → 3 digit
  openPanna: {
    type: Number,
    required: true,
    min: 100,
    max: 999,
  },

  // CLOSE DIGIT → single digit (0–9)
  closeDigit: {
    type: Number,
    required: true,
    min: 0,
    max: 9,
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
      index: true,
    },

    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
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
      validate: {
        validator: arr => Array.isArray(arr) && arr.length > 0,
        message: "At least one bet required",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING",
    },

    playedDate: {
      type: String,
      required: true,
    },

    playedTime: {
      type: String,
      required: true,
    },

    playedWeekday: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

/* ================= AUTO TOTAL (ANTI-TAMPER) ================= */
halfSangamBetSchema.pre("validate", function () {
  this.totalAmount = this.bets.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0
  );
});

module.exports = mongoose.model("HalfSangamBet", halfSangamBetSchema);