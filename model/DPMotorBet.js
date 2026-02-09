const mongoose = require("mongoose");

const dpMotorItemSchema = new mongoose.Schema({
  session: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true
  },

  mainNo: {
    type: Number,
    min: 0,
    max: 9,
    required: true
  },

  underNo: {
    type: String,          // "127", "136" etc
    required: true,
    match: /^\d{3}$/       // exactly 3 digit (000 allowed if needed)
  },

  amountPerUnderNo: {
    type: Number,
    required: true,
    min: 1
  },

  winAmount: {
    type: Number,
    default: 0,
  },

  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING"
  },
});

const dpMotorBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  gameName: { type: String, required: true },

  mainGame: { type: String, default: "MAIN_GAME", immutable: true },
  gameType: { type: String, default: "DP_MOTOR", immutable: true },

  bets: {
    type: [dpMotorItemSchema],
    required: true
  },

  beforeWallet: { type: Number, required: true },
  afterWallet: { type: Number, required: true },

  totalAmount: {
    type: Number,
    required: true
  },

  playedDate: String,
  playedTime: String,
  playedWeekday: String
}, { timestamps: true });

module.exports = mongoose.model("DPMotorBet", dpMotorBetSchema);
