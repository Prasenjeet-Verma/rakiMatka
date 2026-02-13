const mongoose = require("mongoose");

/* ================= SINGLE PANNA ITEM ================= */
const singlePannaItemSchema = new mongoose.Schema({
  mainNo: {
    type: Number,
    required: true,
    min: 0,
    max: 9,
  },

  underNo: {
    type: String,
    required: true,
    match: /^[0-9]{3}$/,
  },

  amount: {
    type: Number,
    required: true,
    min: 1,
  },

  winAmount: {
    type: Number,
    default: 0,
  },

  // 🔥 MODE PER PANNA
  mode: {
    type: String,
    enum: ["OPEN", "CLOSE"],
    required: true,
  },
  /* ================= RESULT ================= */
  resultStatus: {
    type: String,
    enum: ["PENDING", "WIN", "LOSS"],
    default: "PENDING",
  },
});

/* ================= SINGLE PANNA BET ================= */
const singlePannaBetSchema = new mongoose.Schema(
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
      default: "SINGLE_PANNA",
      immutable: true,
    },

    bets: {
      type: [singlePannaItemSchema],
      required: true,
      validate: [
        (arr) => arr.length > 0,
        "At least one single panna bet required",
      ],
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
      required: true,
    },

    winningPanna: {
      type: String,
      default: null,
    },

    /* ================= INDIAN TIME ================= */
    playedDate: String,
    playedTime: String,
    playedWeekday: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("SinglePannaBet", singlePannaBetSchema);
