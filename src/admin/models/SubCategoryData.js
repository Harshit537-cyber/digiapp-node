const mongoose = require('mongoose');

const subCategoryDataSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategoryName: { type: String, required: true },
  
  title: { type: String, required: true }, 
  description: { type: String }, 
  address: { type: String }, 
  rating: { type: Number, default: 5.0 },
  reviewCount: { type: Number, default: 0 },

  isTrusted: { type: Boolean, default: false },
  isCertified: { type: Boolean, default: false },

  analytics: {
    calls: { type: Number, default: 0 },
    chats: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
    saved: { type: Number, default: 0 },
    profileOpens: { type: String, default: "0" },
    impressions: { type: String, default: "0" }
  },

  images: [{ type: String }],

  services: [{
      serviceTitle: String,
      serviceDescription: String,
      serviceImage: String
  }],
  
  status: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }

}, { timestamps: true });

module.exports = mongoose.model('SubCategoryData', subCategoryDataSchema);