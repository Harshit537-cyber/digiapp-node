const admin = require("firebase-admin");

exports.sendNotification = async (fcmToken, title, body, data = {}) => {
  const stringData = {};
  Object.keys(data).forEach((key) => {
    if (data[key]) stringData[key] = String(data[key]);
  });

  const message = {
    token: fcmToken,
    notification: { title, body },
    data: stringData,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "high_importance_channel", 
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Firebase send error:", error.message);
  }
};