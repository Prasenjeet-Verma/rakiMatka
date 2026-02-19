const mongoose = require("mongoose");

const starlineGameResultSchema = new mongoose.Schema({
  gameName: {
    type: String,
    required: true
  },

  session: {
    type: String,
    enum: ["OPEN"],
    required: true
  },

  panna: {
    type: String,
    required: true
  },

  digit: {
    type: Number,
    required: true
  },

  resultDate: {
    type: String // YYYY-MM-DD
  },

  resultTime: {
    type: String // HH:mm
  },

  resultWeekday: {
    type: String // Monday, Tuesday...
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("StarlineGameResult", starlineGameResultSchema);
