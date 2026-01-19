const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    details: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    images: [{ type: String, required: true }], 
    location: { type: String, required: true },
    preferredCommunication: {
        call: { type: Boolean, default: false },
        chat: { type: Boolean, default: false }
    },
     isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiryDate: { type: Date, default: () => Date.now() + 7*24*60*60*1000 } 
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);