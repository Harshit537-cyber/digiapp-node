const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  details: { type: String, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemCategory',
    required: true
  },
  subCategory: {
    type: String,
    required: true
  },
  price: { type: Number, default: 0 },
  images: [{ type: String }],

  location: {
    type: {
      type: String,
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: {
      type: String,
    },
  },

  preferredCommunication: {
    call: { type: Boolean, default: false },
    chat: { type: Boolean, default: false }
  },

  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false }, 
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  expiryDate: {
    type: Date,
    default: () => Date.now() + 7 * 24 * 60 * 60 * 1000
  }

}, { timestamps: true });
itemSchema.index({ location: "2dsphere" });
module.exports = mongoose.model('Item', itemSchema);
