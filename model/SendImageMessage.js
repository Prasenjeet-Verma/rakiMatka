const mongoose = require("mongoose");

const sendImageMessageSchema = new mongoose.Schema({
  sendImage: {
    type: String,
    default: "",   // image URL ya path store hoga
  },
  sendMessage: {
    type: String,
    default: "",   // text message store hoga
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("SendImageMessage", sendImageMessageSchema);