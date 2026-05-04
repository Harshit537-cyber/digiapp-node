const mongoose = require('mongoose');

const subCategoryDataSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', 
    required: true
  },
  subCategoryName: {
    type: String,
    required: true
  },

  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number },
  location: { type: String },
  images: [{ type: String }],
  
  status: { type: Boolean, default: true },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('SubCategoryData', subCategoryDataSchema);