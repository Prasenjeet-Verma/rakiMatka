const mongoose = require("mongoose");

const contactAdminSchema = new mongoose.Schema(
  {
    whatsappNumber: {
      type: String,
      required: true,
      trim: true,
    },

    callNumber: {
      type: String,
      required: true,
      trim: true,
    },

    telegramGroupLink: {
      type: String,
      required: true,
      trim: true,
    },

    whatsappGroupLink: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactAdmin", contactAdminSchema);