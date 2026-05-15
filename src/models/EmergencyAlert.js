// models/EmergencyAlert.js
const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { 
    latitude: Number, 
    longitude: Number, 
    address: String 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Resolved', 'Expired'], 
    default: 'Active' 
  },
  lastAlertSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);