const mongoose = require("mongoose");

/* ===== JODI DIGIT BULK ITEM (INDIVIDUAL) ===== */
const jodiDigitBulkItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number,
    min: 0,
    max: 9,
    required: true,
  },

  underNo: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{2}$/, "underNo must be exactly 2 digits"], 
    // NOTE: jodi digit = 00–99 (2 digit)
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
  },

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

/* ===== JODI DIGIT BULK BET ===== */
const jodiDigitBulkBetSchema = new mongoose.Schema(
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
      default: "JODI_DIGIT_BULK",
      immutable: true,
    },

    bets: {
      type: [jodiDigitBulkItemSchema],
      required: true,
    },

    beforeWallet: {
      type: Number,
      required: true,
    },

    afterWallet: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "JodiDigitBulkBet",
  jodiDigitBulkBetSchema
);
