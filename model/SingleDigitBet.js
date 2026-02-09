const mongoose = require("mongoose");

/* ================= SINGLE DIGIT ITEM ================= */
const singleDigitItemSchema = new mongoose.Schema({
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

  winAmount: {
    type: Number,
    default: 0,
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

/* ================= SINGLE DIGIT BET ================= */
const singleDigitBetSchema = new mongoose.Schema(
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
      default: "SINGLE_DIGIT",
      immutable: true
    },
    bets: {
      type: [singleDigitItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one single digit bet required"
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

module.exports = mongoose.model("SingleDigitBet", singleDigitBetSchema);
