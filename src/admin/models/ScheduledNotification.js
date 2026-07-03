const mongoose = require("mongoose");

const ScheduledNotificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    extraData: { type: Object, default: {} },
    targetType: { type: String, required: true },
    targetValue: { type: String },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ScheduledNotification", ScheduledNotificationSchema);