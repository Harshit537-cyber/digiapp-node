const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");

router.get("/history", chatController.getChatHistory);

module.exports = router;