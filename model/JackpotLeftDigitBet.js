const mongoose = require("mongoose");

const leftDigitItemSchema = new mongoose.Schema({
  openDigit: {
    type: String,
    required: true,
    match: /^[0-9]$/, // Only single digit 0-9
  },
  amount: { type: Number, required: true, min: 1 },
  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING",
  },
});

const leftDigitBetSchema = new mongoose.Schema(
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
    gameName: { type: String, required: true },
    mainGame: { type: String, default: "JACKPOT", immutable: true },
    gameType: { type: String, default: "LEFT_DIGIT", immutable: true },
    bets: {
      type: [leftDigitItemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "At least 1 bet required"],
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
    totalAmount: { type: Number, required: true, min: 1 },
    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeftDigitBet", leftDigitBetSchema);
