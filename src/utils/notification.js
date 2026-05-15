const admin = require("firebase-admin");

exports.sendNotification = async (fcmToken, title, body, data = {}) => {
  const message = {
    notification: { title, body },
    data: data,
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};