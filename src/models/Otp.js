const { Schema, model } = require("mongoose");

const OtpSchema = new Schema({
  mobile: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } 
});

module.exports = model("Otp", OtpSchema);