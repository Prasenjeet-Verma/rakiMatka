const mongoose = require("mongoose");

const mainSettingsSchema = new mongoose.Schema(
  {
    homescreenText: {
      type: String,
      required: true,
      trim: true,
    },
    signupReward: {
      type: Number,
      required: true,
      min: 0,
    },
    minDeposit: {
      type: Number,
      required: true,
      min: 0,
    },
    minWithdraw: {
      type: Number,
      required: true,
      min: 0,
    },
    maxWithdraw: {
      type: Number,
      required: true,
      min: 0,
    },
    minBet: {
      type: Number,
      required: true,
      min: 0,
    },
    maxBet: {
      type: Number,
      required: true,
      min: 0,
    },
    shareLink: {
      type: String,
      required: true,
    },
    withdrawVideoLink: {
      type: String,
      required: true,
    },
    withdrawDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MainSettings", mainSettingsSchema);