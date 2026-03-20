const Message = require("../models/message.model");

exports.getChatHistory = async (req, res) => {
  try {
    const { sender, receiver } = req.query;
    if (!sender || !receiver) {
      return res.status(400).json({ message: "Emails are required" });
    }
    const roomID = [sender, receiver].sort().join("_");
    const history = await Message.find({ room: roomID }).sort({ timestamp: 1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};