const mongoose = require('mongoose');

// --- YEH NAYA CODE HAI ---
// Pehle hum ek service ka structure (schema) banayenge.
// Isse database ko pata chalega ki har service mein kya-kya hoga.
const serviceSchema = new mongoose.Schema({
  serviceTitle: { 
    type: String, 
    required: true 
  },
  serviceDetails: { 
    type: String, 
    required: true 
  },
  serviceImage: { 
    type: String, // Yahan service ki image ka URL save hoga
    required: true 
  }
});


// --- YEH AAPKA PURANA SCHEMA HAI, JISME HUM EK LINE ADD KARENGE ---
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
  ownerImage: { type: String, required: true },
  
  // Admin Verification Flow
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending',
    required: true
  },
  
  // --- SIRF YEH EK LINE ADD KARNI HAI ---
  // Isse business schema mein services ki ek list (array) jud jayegi.
  services: [serviceSchema]

}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);