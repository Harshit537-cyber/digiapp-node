const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const verifyToken = require("../middlewares/auth.middlewares")
router.get("/history", chatController.getChatHistory);

router.get("/inbox", verifyToken, chatController.getInbox);

router.get("/chat-history/:otherUserId", verifyToken, chatController.getChatMessages);

router.delete("/delete-message/:messageId", verifyToken, chatController.deleteMessage);
module.exports = router;