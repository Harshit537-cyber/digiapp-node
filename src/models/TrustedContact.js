const mongoose = require('mongoose');

const trustedContactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  name: {
    type: String,
    required: true
  },
  relation: {
    type: String, 
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  image: {
    type: String, 
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected','Blocked'],
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('TrustedContact', trustedContactSchema);