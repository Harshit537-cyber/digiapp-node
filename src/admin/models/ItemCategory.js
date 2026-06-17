const mongoose = require('mongoose');

const itemCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
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

module.exports = mongoose.model('ItemCategory', itemCategorySchema);