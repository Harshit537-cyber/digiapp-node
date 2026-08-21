const Message = require("../models/message.model");
const mongoose = require("mongoose");
const User = require("../models/User");

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

exports.getInbox = async (req, res) => {
  try {
    const myUserId = new mongoose.Types.ObjectId(req.user.userId || req.user.id);

    const inbox = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: myUserId }, { receiver: myUserId }]
        }
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$roomID",
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ["$lastMessage.sender", myUserId] },
              then: "$lastMessage.receiver",
              else: "$lastMessage.sender"
            }
          }
        }
      },
      {
        $lookup: {
          from: "users", 
          localField: "otherUserId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          roomID: "$_id",
          text: "$lastMessage.text",
          timestamp: "$lastMessage.timestamp",
          moduleType: "$lastMessage.moduleType", 
          referenceId: "$lastMessage.referenceId", 
          user: {
            _id: { $ifNull: ["$userDetails._id", "$otherUserId"] },
            fullName: { $ifNull: ["$userDetails.fullName", "Unknown User"] },
            profilePic: "$userDetails.profilePic"
          }
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    res.status(200).json(inbox);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChatMessages =  async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.userId || req.user.id); 
    const { otherUserId } = req.params; 

    if (!otherUserId) {
      return res.status(400).json({ message: "Other User ID is required" });
    }

    const otherId = new mongoose.Types.ObjectId(otherUserId);
    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId }, 
        { sender: otherId, receiver: myId }  
      ]
    })
    .sort({ timestamp: 1 }) 
    .populate("sender", "fullName profilePic")
    .populate("receiver", "fullName profilePic");

    console.log(`Found ${messages.length} messages between ${myId} and ${otherId}`);

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching history by User ID:", error);
    res.status(500).json({ error: error.message });
  }
};