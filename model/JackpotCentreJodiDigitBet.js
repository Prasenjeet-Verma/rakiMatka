const mongoose = require("mongoose");

const centerJodiDigitItemSchema = new mongoose.Schema({
  openDigit: { type: String, required: true }, // User can type any number
  amount: { type: Number, required: true, min: 1 }
});

const centerJodiDigitBetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
    gameName: { type: String, required: true },
    mainGame: {
      type: String,
      default: "JACKPOT",
      immutable: true
    },
    /* 🔒 FIXED GAME TYPE */
    gameType: {
      type: String,
      default: "CENTER_JODI",
      immutable: true
    },

    bets: {
      type: [centerJodiDigitItemSchema],
      required: true,
      validate: [arr => arr.length > 0, "At least one bet required"]
    },

    totalAmount: { type: Number, default: 0 },

    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING"
    },


    playedDate: { type: String },   // YYYY-MM-DD
    playedTime: { type: String },   // HH:mm
    playedWeekday: { type: String } // Monday, Tuesday...
  },
  { timestamps: true }
);

module.exports = mongoose.model("CenterJodiDigitBet", centerJodiDigitBetSchema);
