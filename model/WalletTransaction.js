const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null if system or payment gateway
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    source: {
      type: String,
      enum: [
        "deposit",
        "withdraw",
        "game_win",
        "game_loss",
        "admin_credit",
        "admin_debit",
        "refund"
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    oldBalance: Number,
    newBalance: Number,

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "success",
    },

    remark: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
