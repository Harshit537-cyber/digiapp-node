// controllers/sos.controller.js
const EmergencyAlert = require("../models/EmergencyAlert");
const TrustedContact = require("../models/TrustedContact");
const User = require("../models/User");
const{ sendNotification} =require("../utils/notification");

exports.triggerSOS = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const userId = req.user.userId;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const newAlert = new EmergencyAlert({
      sender: userId,
      location: { latitude, longitude, address },
      expiresAt: expiresAt
    });
    await newAlert.save();

    const senderUser = await User.findById(userId);

    const contacts = await TrustedContact.find({ 
      contactNumber: senderUser.phoneNumber, 
      status: 'Accepted' 
    }).populate('user'); 

    for (let contact of contacts) {
      if (contact.user && contact.user.fcmToken) {
        await sendNotification(
          contact.user.fcmToken,
          "🚨 EMERGENCY SOS!",
          `${senderUser.name} Is In Trouble! Location: ${address}`,
          { 
            type: "SOS_ALERT", 
            latitude: latitude.toString(), 
            longitude: longitude.toString() 
          }
        );
      }
    }

    return res.status(201).json({ success: true, message: "SOS Sent", alertId: newAlert._id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.deactivateSOS = async (req, res) => {
  try {
    const alert = await EmergencyAlert.findOneAndUpdate(
      { sender: req.user.userId, status: 'Active' },
      { status: 'Resolved' },
      { new: true }
    );

    if (!alert) return res.status(404).json({ message: "No active SOS found" });
    return res.status(200).json({ success: true, message: "SOS Deactivated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};