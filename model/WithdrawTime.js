const mongoose = require("mongoose");

const daySchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const withdrawTimeSchema = new mongoose.Schema(
  {
    sunday: daySchema,
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("WithdrawTime", withdrawTimeSchema);