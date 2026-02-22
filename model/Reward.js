const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rewardAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    rewardType: {
      type: String,
      enum: [
        "signup",      // ✅ NEW
        "bonus",
        "referral",
        "promotion",
        "manual",
        "cashback"
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin id (null if system generated)
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "credited", "cancelled"],
      default: "credited",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reward", rewardSchema);