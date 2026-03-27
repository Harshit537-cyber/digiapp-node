
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, default : " " },

  type: {
    type: String,
    enum: ['jobs', 'sale', 'shop'], 
    required: true
  },

  image: { type: String },

 category: { 
    type: String, 
    default: "" 
  },

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

module.exports = mongoose.model('Category', categorySchema);
