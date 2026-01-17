const mongoose = require("mongoose");

const daySchema = new mongoose.Schema({
  openTime: { type: String },   // "15:40"
  closeTime: { type: String },  // "17:40"
  isActive: { type: Boolean, default: true }
});

const gameSchema = new mongoose.Schema(
  {
    gameName: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    schedule: {
      monday: daySchema,
      tuesday: daySchema,
      wednesday: daySchema,
      thursday: daySchema,
      friday: daySchema,
      saturday: daySchema,
      sunday: daySchema
    },

    createdDay: {
      type: String // Monday, Tuesday etc
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true } // createdAt & updatedAt auto
);

module.exports = mongoose.model("Game", gameSchema);
