const mongoose = require("mongoose");

const spMotorItemSchema = new mongoose.Schema({
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
  },
    resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING"
  },
});

const spMotorBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  gameName: { type: String, required: true },

  mainGame: { type: String, default: "MAIN_GAME", immutable: true },
  gameType: { type: String, default: "SP_MOTOR", immutable: true },

  bets: {
    type: [spMotorItemSchema],
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

module.exports = mongoose.model("SPMotorBet", spMotorBetSchema);