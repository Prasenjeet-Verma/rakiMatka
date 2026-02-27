const mongoose = require("mongoose");
const userWalletTransactionSchema = new mongoose.Schema(
  {
     user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    withdrawUpi: {
      type: String,
      enum: ["phonepe", "gpay", "paytm", "bank", "manual"],
      default: null,
    },

    depositUpi: {
      type: String,
      enum: ["phonepe", "gpay", "paytm", "bank", "manual",null],
      default: null,
    },
   
  gettingdepositManualy: {
    type: String,
    enum: ["manual"],
    default:null
  },

  gettingWithdrawManualy: {
    type: String,
    enum: ["manual"],
    default:null
  },

    withdrawOnUpiIdOrMobileNo: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed", "rejected"],
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
  "UserWalletTransaction",
  userWalletTransactionSchema
);