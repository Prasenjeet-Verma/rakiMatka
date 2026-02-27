const mongoose = require("mongoose");

const adminWalletTransactionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    relatedUser: {
      // which user wallet was affected
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    source: {
      type: String,
      enum: [
        "user_deposit",
        "user_withdraw",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    oldBalance: {
      type: Number,
      required: true,
    },

    newBalance: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["success", "failed", "rejected"],
      default: "success",
    },

    remark: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AdminWalletTransaction",
  adminWalletTransactionSchema
);