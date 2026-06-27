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

exports.sendToMultiple = async (tokens, title, body, data = {}) => {
  const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim() !== "");
  
  if (validTokens.length === 0) {
    console.log("No valid tokens provided for bulk notification.");
    return;
  }

  const stringData = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      stringData[key] = String(data[key]);
    }
  });

  const message = {
    tokens: validTokens, 
    notification: { 
      title: title, 
      body: body 
    },
    data: stringData,
    android: {
      priority: "high",
      notification: { 
        sound: "default", 
        channelId: "high_importance_channel" 
      },
    },
    apns: { 
      payload: { 
        aps: { 
          sound: "default", 
          badge: 1 
        } 
      } 
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Bulk Notification Summary:`);
    console.log(`- Total attempted: ${validTokens.length}`);
    console.log(`- Successfully sent: ${response.successCount}`);
    console.log(`- Failed: ${response.failureCount}`);
    
    return response;
  } catch (error) {
    console.error("Firebase bulk send error:", error.message);
  }
};
