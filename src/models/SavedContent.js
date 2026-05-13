const mongoose = require('mongoose');

const savedContentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'itemType' 
  },
  itemType: { 
    type: String, 
    required: true, 
    enum: ['Job', 'Business', 'Item'] 
  },
   jobCategory: { type: String },
}, { timestamps: true });


savedContentSchema.index({ userId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('SavedContent', savedContentSchema);