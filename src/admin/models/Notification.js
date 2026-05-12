const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetAudience: { type: String, enum: ['Global', 'City-based', 'Category', 'Specific User'] },
    selection: { type: String }, // City name, Category name ya User ID
    status: { type: String, default: 'Sent' },
    sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);