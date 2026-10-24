const cron = require("node-cron");
const BloodRequest = require("../models/BloodRequest");
const User = require("../models/User");
const { sendNotification } = require("../utils/notification");

// Runs every 15 minutes to check for expiry reminder (1 day before) and auto-expiration (7 days)
cron.schedule("*/15 * * * *", async () => {
  try {
    const now = new Date();
    const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Send reminder notification 1 day before expiry
    const requestsNeedingReminder = await BloodRequest.find({
      status: "Active",
      expiryReminderSent: false,
      expiresAt: { $lte: oneDayAhead, $gt: now },
    });

    for (const request of requestsNeedingReminder) {
      try {
        if (request.userId) {
          const user = await User.findById(request.userId);
          if (user && user.fcmToken) {
            const title = "Blood Request Expiring Soon";
            const body = `Your blood request for ${request.patientName} (${request.bloodGroup}) will expire within 1 day.`;
            const data = {
              requestId: request._id.toString(),
              type: "BLOOD_REQUEST_EXPIRING_SOON",
            };

            await sendNotification(user.fcmToken, title, body, data);
          }
        }
      } catch (notifErr) {
        console.error(
          `[BloodRequestCron] Failed to send reminder for request ${request._id}:`,
          notifErr.message
        );
      } finally {
        // Mark reminder as sent so we don't repeat notifications
        await BloodRequest.updateOne(
          { _id: request._id },
          { expiryReminderSent: true }
        );
      }
    }

    // 2. Mark requests as Expired if 7 days have passed
    const expiredResult = await BloodRequest.updateMany(
      {
        status: "Active",
        expiresAt: { $lte: now },
      },
      {
        status: "Expired",
      }
    );

    if (expiredResult.modifiedCount > 0) {
      console.log(
        `[BloodRequestCron] Marked ${expiredResult.modifiedCount} blood request(s) as Expired.`
      );
    }
  } catch (error) {
    console.error("[BloodRequestCron] Cron job error:", error);
  }
});
