// models/PlanConfig.js
const mongoose = require("mongoose");

const planConfigSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true }, 
  name: { type: String, required: true },
  price: { type: Number, required: true },
  credits: { type: Number, default: 0 },
  category: { type: String, enum: ['CREDIT', 'SUBSCRIPTION'], required: true },
   duration: { 
    type: String, 
    enum: ['MONTHLY', 'YEARLY', 'NONE'], 
    default: 'NONE' 
  },
  description: String
}, { timestamps: true });

module.exports = mongoose.model("PlanConfig", planConfigSchema);