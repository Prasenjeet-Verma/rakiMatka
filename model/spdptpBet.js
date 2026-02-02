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
    required: true,
    min: 0,
    max: 9,
  },

  underNos: {
    type: [String], // array of 3-digit numbers
    required: true,
    validate: {
      validator: (arr) => arr.every((n) => /^[0-9]{3}$/.test(n)),
      message: "Each underNo must be 3 digits",
    },
  },
  perUnderNosPoints: {
    type: Number,
    required: true,
    min: 1,
  },
  totalPoints: {
    type: Number,
    required: true,
    min: 1,
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

// Automatically calculate totalPoints per bet and totalAmount
spdptpBetSchema.pre("validate", function () {
  if (Array.isArray(this.bets)) {
    this.bets.forEach((b) => {
      if (Array.isArray(b.underNos)) {
        b.totalPoints = b.totalPoints || 0;
      }
    });
    this.totalAmount = this.bets.reduce((sum, b) => sum + b.totalPoints, 0);
  }
});

module.exports = mongoose.model("spdptpBet", spdptpBetSchema);
