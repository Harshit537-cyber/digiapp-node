const admin = require("../config/firebase");

class NotificationService {
    static formatTopic(prefix, value) {
        if (!value) return null;
        const cleanValue = value
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/gi, "")
            .replace(/\s+/g, "_");
        return `${prefix}_${cleanValue}`;
    }
    static async syncUserTopics(token, user) {
        try {
            if (!token) {
                console.log("No token found for subscription");
                return;
            }
            console.log(`Subscribing token to topics for user: ${user.fullName}`);


            await admin.messaging().subscribeToTopic(token, "global_all_users");
            console.log("SUCCESS: Subscribed to global_all_users");
            if (user.city) {
                const cityTopic = this.formatTopic("city", user.city);
                await admin.messaging().subscribeToTopic(token, cityTopic);
                console.log(`Subscribed to city topic: ${cityTopic}`);
            }

            if (user.role) {
                const catTopic = this.formatTopic("cat", user.role);
                await admin.messaging().subscribeToTopic(token, catTopic);
                console.log(`Subscribed to category topic: ${catTopic}`);
            }

            if (user.bloodGroup) {
                const bloodVal = user.bloodGroup.replace(/\+/g, "_plus").replace(/-/g, "_minus");
                const bloodTopic = this.formatTopic("blood", bloodVal);
                await admin.messaging().subscribeToTopic(token, bloodTopic);
                console.log(`Subscribed to blood topic: ${bloodTopic}`);
            }
        } catch (error) {
            console.error("FCM Subscription Sync Error:", error.message);
        }
    }


    static async sendNotification({ target, isTopic = false, title, body, imageUrl = "", data = {} }) {
        try {
            const stringData = Object.keys(data).reduce((acc, key) => {
                acc[key] = String(data[key]);
                return acc;
            }, {});

            const message = {
                notification: { title, body, image: imageUrl },
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
                            badge: 1,
                            "mutable-content": 1 
                        } 
                    },
                    fcm_options: {
                        image: imageUrl 
                    }
                },
            };

            if (isTopic) {
                message.topic = target;
            } else {
                message.token = target;
            }

            const response = await admin.messaging().send(message);
            return { success: true, response };
        } catch (error) {
            console.error("FCM Delivery Error:", error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = NotificationService;