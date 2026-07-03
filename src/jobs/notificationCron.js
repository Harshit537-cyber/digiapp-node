const cron = require("node-cron");
const ScheduledNotification = require("../../src/admin/models/ScheduledNotification");
const NotificationService = require("../services/notificationService");
const User = require("../models/User");

cron.schedule("* * * * *", async () => {
    try {
        const now = new Date();

        const pendingNotifications = await ScheduledNotification.find({
            status: "pending",
            scheduledAt: { $lte: now }
        });

        if (pendingNotifications.length === 0) return;

        console.log(`[Cron] Found ${pendingNotifications.length} notifications to send.`);

        for (const notif of pendingNotifications) {
            let notificationParams = {
                title: notif.title,
                body: notif.body,
                imageUrl: notif.imageUrl || "",
                data: notif.extraData || {}
            };

            let targetFound = false;

            try {
                switch (notif.targetType) {
                    case "GLOBAL":
                        notificationParams.target = "global_all_users";
                        notificationParams.isTopic = true;
                        targetFound = true;
                        break;

                    case "CITY":
                        if (notif.targetValue) {
                            notificationParams.target = NotificationService.formatTopic("city", notif.targetValue);
                            notificationParams.isTopic = true;
                            targetFound = true;
                        }
                        break;

                    case "CATEGORY":
                        if (notif.targetValue) {
                            notificationParams.target = NotificationService.formatTopic("cat", notif.targetValue);
                            notificationParams.isTopic = true;
                            targetFound = true;
                        }
                        break;

                    case "USER":
                        const user = await User.findById(notif.targetValue).select("fcmToken");
                        if (user && user.fcmToken) {
                            notificationParams.target = user.fcmToken;
                            notificationParams.isTopic = false;
                            targetFound = true;
                        }
                        break;
                }

                if (targetFound) {
                    const result = await NotificationService.sendNotification(notificationParams);
                    
                    if (result.success) {
                        notif.status = "sent";
                        console.log(`[Cron] Notification sent successfully: ${notif._id}`);
                    } else {
                        notif.status = "failed";
                        console.error(`[Cron] Failed to send: ${result.error}`);
                    }
                } else {
                    notif.status = "failed";
                    console.error(`[Cron] Target not found for: ${notif._id}`);
                }

            } catch (innerError) {
                notif.status = "failed";
                console.error(`[Cron] Error processing notif ${notif._id}:`, innerError.message);
            }

            await notif.save();
        }
    } catch (error) {
        console.error("Critical Cron Job Error:", error);
    }
});