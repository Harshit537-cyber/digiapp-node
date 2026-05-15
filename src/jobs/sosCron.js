const cron = require('node-cron');
const EmergencyAlert = require('../models/EmergencyAlert');
const TrustedContact = require('../models/TrustedContact');
const User = require('../models/User');
const{ sendNotification} =require("../utils/notification");


cron.schedule('* * * * *', async () => {
  const now = new Date();

  await EmergencyAlert.updateMany(
    { status: 'Active', expiresAt: { $lte: now } },
    { status: 'Expired' }
  );

  const activeAlerts = await EmergencyAlert.find({ status: 'Active' }).populate('sender');

  for (let alert of activeAlerts) {
    const diffInMinutes = Math.floor((now - alert.lastAlertSentAt) / (1000 * 60));

    if (diffInMinutes >= 10) {
      const contacts = await TrustedContact.find({ 
        contactNumber: alert.sender.phoneNumber, 
        status: 'Accepted' 
      }).populate('user');

      for (let contact of contacts) {
        if (contact.user && contact.user.fcmToken) {
          await sendNotification(
            contact.user.fcmToken,
            "🚨 SOS STILL LIVE!",
            `${alert.sender.name} अभी भी खतरे में है! लोकेशन: ${alert.location.address}`,
            { type: "SOS_REPEAT" }
          );
        }
      }

      alert.lastAlertSentAt = now;
      await alert.save();
    }
  }
});