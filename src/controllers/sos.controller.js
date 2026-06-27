// controllers/sos.controller.js
const EmergencyAlert = require("../models/EmergencyAlert");
const TrustedContact = require("../models/TrustedContact");
const User = require("../models/User");
const{ sendNotification} =require("../utils/notification");


exports.triggerSOS = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const userId = req.user.userId;

    console.log(`\n================== SOS TRIGGERED ==================`);
    console.log(`[PROCESS] Started by User ID: ${userId}`);

    const expiresAt = new Date(Date.now() + 3600000); 
    const newAlert = new EmergencyAlert({
      sender: userId,
      location: { latitude, longitude, address },
      expiresAt: expiresAt
    });
    await newAlert.save();
    console.log(`✅ [STEP 1] SOS Alert saved to DB. Alert ID: ${newAlert._id}`);

    const senderUser = await User.findById(userId);
    const sName = senderUser ? senderUser.fullName : "Someone";

    console.log(`🔍 [STEP 2] Searching for contacts added by ${sName}...`);
    const myTrustedContacts = await TrustedContact.find({ 
      user: userId, 
      status: 'Accepted' 
    }); 

    if (myTrustedContacts.length === 0) {
      console.log(`⚠️ [RESULT] No trusted contacts found in your list.`);
    } else {
      console.log(`✅ [RESULT] Found ${myTrustedContacts.length} contacts in your list.`);
    }

    let notificationCount = 0;

    for (const contact of myTrustedContacts) {
      const targetMobile = contact.contactNumber;
      console.log(`\n🚀 [SENDING] Attempting to notify: ${targetMobile}`);

      const recipient = await User.findOne({ mobile: targetMobile });

      if (recipient) {
        if (recipient.fcmToken) {
          await sendNotification(
            recipient.fcmToken,
            "🚨 EMERGENCY SOS!",
            `${sName} Is In Trouble! Location: ${address}`,
            { 
              type: "SOS_ALERT", 
              latitude: latitude.toString(), 
              longitude: longitude.toString() 
            }
          );
          notificationCount++;
          console.log(`✨ [SUCCESS] Notification delivered to: ${recipient.fullName}`);
        } else {
          console.log(`⚠️ [SKIPPED] ${recipient.fullName} has no FCM Token.`);
        }
      } else {
        console.log(`❌ [FAILED] No App User found with number: ${targetMobile}`);
      }
    }

    console.log(`\n================== SOS PROCESS FINISHED ==================`);
    console.log(`[SUMMARY] Total Notifications Sent: ${notificationCount}`);
    console.log(`==========================================================\n`);

    return res.status(201).json({
      success: true,
      message: `SOS sent to ${notificationCount} contacts`,
      alertId: newAlert._id,
      notificationsSent: notificationCount 
    });

  } catch (error) {
    console.error(`\n❌ [CRITICAL ERROR] SOS API Failed:`, error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.deactivateSOS = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`\n================== DEACTIVATING SOS ==================`);

    const alert = await EmergencyAlert.findOneAndUpdate(
      { sender: userId, status: 'Active' },
      { status: 'Resolved' },
      { new: true }
    );

    if (!alert) {
      console.log(`⚠️ [RESULT] No active SOS found for this user.`);
      return res.status(404).json({ 
        success: false, 
        message: "No active SOS found" 
      });
    }

    console.log(`✅ [STEP 1] SOS status marked as Resolved in DB.`);

    const senderUser = await User.findById(userId);
    const sName = senderUser ? senderUser.fullName : "Someone";

    console.log(`🔍 [STEP 2] Notifying trusted contacts that ${sName} is safe...`);
    
    const myTrustedContacts = await TrustedContact.find({ 
      user: userId, 
      status: 'Accepted' 
    }); 

    let notificationCount = 0;

    for (const contact of myTrustedContacts) {
      const recipient = await User.findOne({ mobile: contact.contactNumber });

      if (recipient && recipient.fcmToken) {
        await sendNotification(
          recipient.fcmToken,
          "✅ I AM SAFE NOW", 
          `${sName} has deactivated the SOS and is safe now.`, 
          { 
            type: "SOS_DEACTIVATED", 
            alertId: alert._id.toString() 
          }
        );
        notificationCount++;
      }
    }

    console.log(`✨ [SUCCESS] SOS Deactivated and ${notificationCount} contacts notified.`);
    console.log(`======================================================\n`);

    return res.status(200).json({ 
      success: true, 
      message: "SOS Deactivated and contacts notified",
      notificationsSent: notificationCount
    });

  } catch (error) {
    console.error(`❌ [ERROR] Deactivate SOS Failed:`, error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};