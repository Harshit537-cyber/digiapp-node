const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');

router.post("/send", adminAuth, require('../controllers/notificationController').sendPushNotification);

router.get("/history", adminAuth, require('../controllers/notificationController').getNotificationHistory);
router.delete("/:id", notificationController.deleteNotification);

router.delete("/", notificationController.clearAllNotifications);

module.exports = router;