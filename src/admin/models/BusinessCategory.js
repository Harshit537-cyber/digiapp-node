const mongoose = require('mongoose');

const businessCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    unique: true 
  },

  type: {
    type: String,
    default: "Business"
  },

  image: { type: String }, 

  subCategory: { 
    type: [String], 
    default: [] 
  },

  status: { type: Boolean, default: true },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('BusinessCategory', businessCategorySchema);