const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");

router.get("/api/chat", chatController.getChatHistory);

module.exports = router;