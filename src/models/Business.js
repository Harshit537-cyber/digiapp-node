const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true 
  },
  
  // Text Fields
  businessName: { type: String, required: true },
  details: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true }, 
  address: { type: String, required: true },
  
  // Owner Details
  ownerName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  whatsappNumber: { type: String, required: true },

  // Image URLs (Cloudinary)
  businessImages: [{ type: String, required: true }], 
  nationalIdImage: { type: String, required: true },  
  ownerImage: { type: String, required: true }        

}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);