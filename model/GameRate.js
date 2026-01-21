const mongoose = require("mongoose");

const gameRateSchema = new mongoose.Schema(
  {
    gameType: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
      // example: "SINGLE DIGIT", "JODI", "SP MOTOR"
    },

    betAmount: {
      type: Number,
      required: true,
      min: 1
    },

    profitAmount: {
      type: Number,
      required: true,
      min: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // createdAt & updatedAt auto
  }
);

module.exports = mongoose.model("GameRate", gameRateSchema);
