const admin = require("../config/firebase"); 
const User = require("../models/User");

const sendPushToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);

    
    if (!user || !user.fcmToken) {
      console.log(`Notification skipped: No FCM token found for user ${userId}`);
      return null;
    }

    const stringData = {};
    Object.keys(data).forEach((key) => {
      stringData[key] = String(data[key]);
    });

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: stringData, 
      token: user.fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent message to Firebase:", response);
    return response;

  } catch (error) {
    
    console.error("FCM Error Code:", error.code);

    if (
      error.code === 'messaging/registration-token-not-registered' || 
      error.code === 'messaging/invalid-registration-token'
    ) {
      console.log(`Cleaning up invalid token for user: ${userId}`);
      await User.findByIdAndUpdate(userId, { fcmToken: null });
    }

    throw error;
  }
};

module.exports = { sendPushToUser };