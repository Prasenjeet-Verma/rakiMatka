const mongoose = require("mongoose");

const homeSliderImageSchema = new mongoose.Schema({
  sliderImage1: { type: String, default: "" },
  sliderImage2: { type: String, default: ""},
  sliderImage3: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("HomeSliderImage", homeSliderImageSchema);