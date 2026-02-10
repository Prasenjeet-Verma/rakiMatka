const mongoose = require("mongoose");

const jackpotGameResultSchema = new mongoose.Schema({
  gameName: {
    type: String,
    required: true
  },

  left: {
    type: String,
    required: true
  },

  right: {
    type: Number,
    required: true
  },
 
   jodi: {
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

module.exports = mongoose.model("JackpotGameResult", jackpotGameResultSchema);
