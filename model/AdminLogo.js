const mongoose = require("mongoose");

const adminLogoSchema = new mongoose.Schema(
  {
    logoUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminLogo", adminLogoSchema);