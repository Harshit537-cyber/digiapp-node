const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middlewares/adminAuth");
const adminNotificationController = require("../controllers/adminNotificationController");


router.post("/send",verifyAdmin,  adminNotificationController.sendAdminNotification);

module.exports = router;