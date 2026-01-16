const mongoose = require("mongoose");

const userBankDetailsSchema = new mongoose.Schema(
  {
    // 🔗 Relation with User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // ek user ki ek hi bank detail
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
    },

    branchAddress: {
      type: String,
      required: true,
      trim: true,
    },

    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },

    accountNumber: {
      type: String, // number ko STRING rakho (safe)
      required: true,
      minlength: 6,
      maxlength: 20,
    },

    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 11,
      maxlength: 11,
    },

    // Admin verification (future use)
    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserBankDetails", userBankDetailsSchema);
