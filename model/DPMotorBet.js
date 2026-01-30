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
  }
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

  totalAmount: { type: Number, required: true },
  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING"
  },

  playedDate: String,
  playedTime: String,
  playedWeekday: String
}, { timestamps: true });

module.exports = mongoose.model("DPMotorBet", dpMotorBetSchema);