const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },

  imageUrl: { 
    type: String, 
    required: true 
  },

  bannerType: {
    type: String,
    enum: ["FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH", "SHOP_IMAGE"], 
    required: true,
    unique: true 
  }

}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);