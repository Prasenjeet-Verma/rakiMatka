const mongoose = require("mongoose");

const manualDepositSchema = new mongoose.Schema({
  qrImage: String,
  upiId: String,
  bankDetails: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ManualDeposit", manualDepositSchema);