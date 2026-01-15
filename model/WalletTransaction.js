const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    // The primary user whose wallet is affected
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Admin involved in the transaction (null if system/payment gateway)
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // credit = wallet increases, debit = wallet decreases
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    // Source of transaction
    source: {
      type: String,
      enum: [
        "deposit",        // User deposits money (e.g., payment gateway)
        "withdraw",       // User withdraws money
        "game_win",       // User wins in a game
        "game_loss",      // User loses in a game
        "admin_credit",   // Admin adds money to user wallet
        "admin_debit",    // Admin removes money from user wallet
        "refund"          // Refunds
      ],
      required: true,
    },

    // Amount of this transaction
    amount: {
      type: Number,
      required: true,
    },

    // Wallet balances before/after the transaction
    oldBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },

    // Optional admin wallet snapshot if admin is involved
    adminOldBalance: { type: Number },
    adminNewBalance: { type: Number },

    // Transaction status
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "success",
    },

    // Optional remarks for clarity
    remark: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
