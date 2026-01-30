const mongoose = require("mongoose");

/* ================= SINGLE UNDER NUMBER BET ================= */
const underNoItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number, // 0-9
    required: true,
    min: 0,
    max: 9
  },
  underNo: {
    type: String, // "00" to "99"
    required: true,
    match: /^[0-9]{2}$/
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  }
});

/* ================= JODI DIGIT BET ================= */
const jodiDigitBetSchema = new mongoose.Schema(
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
      default: "JODI_DIGIT",
      immutable: true
    },
    mode: {
      type: String,
      default: "OPEN",
      immutable: true
    },
    bets: {
      type: [underNoItemSchema],
      required: true,
      validate: [
        arr => arr.length > 0,
        "At least one jodi bet required"
      ]
    },

    totalAmount: {
      type: Number,
      required: true
    },

    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING"
    },

    winningJodi: {
      type: String,
      default: null
    },

    playedDate: String,
    playedTime: String,
    playedWeekday: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("JodiDigitBet", jodiDigitBetSchema);
