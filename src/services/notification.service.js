const admin = require("../config/firebase"); 
const User = require("../models/User");

const sendPushToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);

    if (!user || !user.fcmToken) {
      console.log(`No FCM token found for user: ${userId}`);
      return null;
    }

    const message = {
      notification: { title, body },
      data: data,
      token: user.fcmToken, 
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      await User.findByIdAndUpdate(userId, { fcmToken: null });
    }
    console.error("FCM Error:", error);
    throw error;
  }
};

module.exports = { sendPushToUser };