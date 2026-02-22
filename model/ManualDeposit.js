const mongoose = require("mongoose");

const manualDepositSchema = new mongoose.Schema({
  qrImage: String,
  upiId: String,
  bankDetails: String,
  isActive: {
    type: Boolean,
    default: true, // by default active rahega
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ManualDeposit", manualDepositSchema);
