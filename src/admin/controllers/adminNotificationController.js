const User = require("../../models/User");
const NotificationService = require("../../services/notificationService");
const ScheduledNotification = require("../models/ScheduledNotification");



exports.sendAdminNotification = async (req, res) => {
  try {
    const { targetType, targetValue, title, body, scheduledAt, imageUrl, extraData } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: "Title and Body are required" });
    }
    if (scheduledAt) {
      await ScheduledNotification.create({
        title, body, imageUrl, extraData, targetType, targetValue,
        scheduledAt: new Date(scheduledAt)
      });
      return res.status(200).json({ success: true, message: "Notification Scheduled!" });
    }

    let notificationParams = {
      title,
      body,
      imageUrl: imageUrl || "",
      data: extraData || {}
    };

    switch (targetType) {
      case "GLOBAL":
        notificationParams.target = "global_all_users";
        notificationParams.isTopic = true;
        break;

      case "CITY":
        if (!targetValue) return res.status(400).json({ message: "City name missing" });
        notificationParams.target = NotificationService.formatTopic("city", targetValue);
        notificationParams.isTopic = true;
        break;

      case "CATEGORY":
        if (!targetValue) return res.status(400).json({ message: "Category/Role missing" });
        notificationParams.target = NotificationService.formatTopic("cat", targetValue);
        notificationParams.isTopic = true;
        break;

      case "BLOOD_GROUP":
        if (!targetValue) return res.status(400).json({ message: "Blood group missing" });
        const bloodVal = targetValue.replace(/\+/g, "_plus").replace(/-/g, "_minus");
        notificationParams.target = NotificationService.formatTopic("blood", bloodVal);
        notificationParams.isTopic = true;
        break;

      case "GENDER":
        if (!targetValue) return res.status(400).json({ message: "Gender value missing" });
        notificationParams.target = NotificationService.formatTopic("gender", targetValue);
        notificationParams.isTopic = true;
        break;

case "USER_TYPE":
        if (!targetValue) return res.status(400).json({ message: "User type missing" });
        notificationParams.target = NotificationService.formatTopic("cat", targetValue);
        notificationParams.isTopic = true;
        break;

      case "USER":
        const user = await User.findById(targetValue).select("fcmToken");
        if (!user || !user.fcmToken) {
          return res.status(404).json({ success: false, message: "User or Token not found" });
        }
        notificationParams.target = user.fcmToken;
        notificationParams.isTopic = false;
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid targetType" });
    }

    const result = await NotificationService.sendNotification(notificationParams);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Notification sent to ${targetType}`,
        fcmId: result.response
      });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error("Admin Controller Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};



