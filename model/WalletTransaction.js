const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      //(whose wallet changed)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    relatedUser: {
      //actual deposit user
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // credit = wallet increases, debit = wallet decreases
    type: {
      type: String,
      enum: ["user_credit", "user_debit", "admin_credit", "admin_debit", "deposit_rejected","withdraw_rejected"],
      required: true,
    },

    // Source of transaction
    source: {
      type: String,
      enum: [
        "deposit", // User deposits money (e.g., payment gateway)
        "withdraw", // User withdraws money
        "game_win", // User wins in a game
        "game_loss", // User loses in a game
        "admin_deposit_user", // Admin adds money to user wallet
        "admin_withdraw_user", // Admin removes money from user wallet
        "refund", // Refunds
        "user_deposit_rejected",
        "user_withdraw_rejected",
      ],
      required: true,
    },
    // Payment method selected by user for receiving money
    receiveMethod: {
      type: String,
      enum: ["phonepe", "gpay", "paytm", "bank", "manual",null],
      default: null,
    },
    payMethod: {
      type: String,
      enum: ["phonepe", "gpay", "paytm", "bank", "manual",null],
      default: null,
    },

    // User entered mobile number or UPI ID for withdraw
    mobileNoOrUpiId: {
      type: String,
      default: null,
    },
    // Amount of this transaction
    amount: {
      type: Number,
      required: true,
    },

    // Wallet balances before/after the transaction
    oldBalance: { type: Number },
    newBalance: { type: Number },

    // Optional admin wallet snapshot if admin is involved
    adminOldBalance: { type: Number },
    adminNewBalance: { type: Number },

    // Transaction status
    status: {
      type: String,
      enum: ["pending", "success", "failed", "rejected"],
      default: "success",
    },

    // Optional remarks for clarity
    remark: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
