const mongoose = require("mongoose");

const spdptpItemSchema = new mongoose.Schema({
  session: {
    type: String,
    enum: ["Open", "Close"],
    required: true,
  },
  choose: {
    type: [String],
    enum: ["SP", "DP", "TP"],
    required: true,
  },
  openDigit: {
    type: Number,
    required: true,
  },
  points: {
    type: Number,
    required: true,
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
    gameType: {
      type: String,
      default: "SP_DP_TP",
      immutable: true,
    },
    bets: {
      type: [spdptpItemSchema],
      required: true,
      validate: [arr => arr.length > 0, "At least one bet required"],
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    resultStatus: {
      type: String,
      enum: ["PENDING", "WIN", "LOSS"],
      default: "PENDING",
    },
    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true }
);

spdptpBetSchema.pre("validate", function () {
  if (Array.isArray(this.bets)) {
    this.totalAmount = this.bets.reduce(
      (sum, b) => sum + b.points,
      0
    );
  }
});


module.exports = mongoose.model("spdptpBet", spdptpBetSchema);