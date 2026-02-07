const mongoose = require("mongoose");

/* ================= ITEM SCHEMA ================= */
const redBracketItemSchema = new mongoose.Schema({
  bracketType: {
    type: String,
    enum: ["HALF", "FULL"],
    required: true,
  },

  underNo: {
    type: String, // "05", "16", "00" etc
    required: true,
    match: /^\d{2}$/, // exactly 2 digit (00 allowed)
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
  },

    /* 🔥 NEW (same as other games) */
  openMatched: {
    type: Boolean,
    default: false,
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



/* ================= MAIN SCHEMA ================= */
const redBracketBetSchema = new mongoose.Schema(
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
      default: "RED_BRACKET",
      immutable: true,
    },

    bets: {
      type: [redBracketItemSchema],
      required: true,
      validate: [
        arr => Array.isArray(arr) && arr.length > 0,
        "At least one bet required",
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
    // total = sum of all bet.points
    totalAmount: {
      type: Number,
      min: 1,
    },


    playedDate: {
      type: String,
    },

    playedTime: {
      type: String,
    },

    playedWeekday: {
      type: String,
    },
  },
  { timestamps: true }
);

/* ================= PRE-VALIDATE HOOK ================= */
redBracketBetSchema.pre("validate", function () {
  if (Array.isArray(this.bets)) {
    this.totalAmount = this.bets.reduce(
      (sum, b) => sum + (b.totalPoints || 0),
      0
    );
  }
});


/* ================= EXPORT ================= */
module.exports = mongoose.model("RedBracketBet", redBracketBetSchema);
