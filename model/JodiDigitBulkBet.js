const mongoose = require("mongoose");

const jodiDigitBulkItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number,
    min: 0,
    max: 9,
    required: true
  },
  underNos: {
    type: [String],
    required: true
  },
  perUnderNosPoints: {
    type: Number,
    required: true,
    min: 1
  },
  totalPoints: {
    type: Number,
    required: true
  },
    resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING"
  },
});

const jodiDigitBulkBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  gameName: { type: String, required: true },

  mainGame: { type: String, default: "MAIN_GAME", immutable: true },
  gameType: { type: String, default: "JODI_DIGIT_BULK", immutable: true },

  bets: {
    type: [jodiDigitBulkItemSchema],
    required: true
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
  totalAmount: { type: Number, required: true },

  playedDate: String,
  playedTime: String,
  playedWeekday: String
}, { timestamps: true });

module.exports = mongoose.model("JodiDigitBulkBet", jodiDigitBulkBetSchema);