const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true 
  },

  imageUrl: { 
    type: String, 
    required: true 
  },

  description: { 
    type: String, 
    trim: true,
    default: "" 
  },

  isActive: { 
    type: Boolean, 
    default: true 
  },

  position: {
    type: String,
    enum: ["TOP", "MIDDLE", "BOTTOM", "SIDEBAR"], 
    default: "TOP"
  },

  

}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);