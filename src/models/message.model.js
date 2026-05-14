const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  roomID: { type: String, required: true, index: true },
  
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  text: { type: String, required: true },
  
  moduleType: { 
    type: String, 
    required: true, 
    enum: ["Job", "Business", "Item"] 
  },
  
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);