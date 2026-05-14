const Message = require("../models/message.model");

exports.getChatHistory = async (req, res) => {
  try {
    const { roomID } = req.query; 

    if (!roomID) {
      return res.status(400).json({ message: "roomID is required" });
    }

    const history = await Message.find({ roomID })
      .sort({ timestamp: 1 })
      .populate("sender", "fullName")   
      .populate("receiver", "fullName");

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};