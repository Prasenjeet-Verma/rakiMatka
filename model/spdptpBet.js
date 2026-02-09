const mongoose = require("mongoose");

const spdptpItemSchema = new mongoose.Schema({
  session: {
    type: String,
    enum: ["Open", "Close"],
    required: true,
  },

  type: {
    type: String,
    enum: ["SP", "DP", "TP"],
    required: true,
  },

  mainNo: {
    type: Number,
    min: 0,
    max: 9,
    required: true,
  },

  underNo: {
    type: String,
    required: true,
    match: /^\d{3}$/, // ✅ 000 allowed
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1,
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


const spdptpBetSchema = new mongoose.Schema(
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
      default: "SP_DP_TP",
      immutable: true,
    },

    bets: {
      type: [spdptpItemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "At least one bet required"],
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
      default: 0,
    },

    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("spdptpBet", spdptpBetSchema);
