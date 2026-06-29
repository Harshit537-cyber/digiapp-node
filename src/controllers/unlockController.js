const mongoose = require("mongoose");
const Unlock = require("../models/Unlock");
const User = require("../models/User");
const Job = require("../models/Job");
const Item = require("../models/Item");
const Business = require("../models/Business");
const Transaction = require("../models/Transaction");

const UNLOCK_COST = 5; 

exports.unlockEntity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { targetId, targetModel } = req.body;
    const userId = req.user.userId;

    if (!["Job", "Item", "Business"].includes(targetModel)) {
      throw new Error("Invalid target model type");
    }

    const existingUnlock = await Unlock.findOne({ userId, targetId }).session(session);
    if (existingUnlock) {
      return res.status(200).json({ success: true, message: "Already unlocked", data: existingUnlock });
    }

    let Model;
    if (targetModel === "Job") Model = Job;
    else if (targetModel === "Item") Model = Item;
    else Model = Business;

    const entity = await Model.findById(targetId).session(session);
    if (!entity) throw new Error(`${targetModel} not found`);

    const ownerId = entity.userId || entity.user; 
    if (ownerId.toString() === userId) {
        return res.status(200).json({ success: true, message: "Owner access", data: entity });
    }

    const user = await User.findById(userId).session(session);
    if (user.credits < UNLOCK_COST) {
      throw new Error("Insufficient credits to unlock");
    }

    user.credits -= UNLOCK_COST;
    await user.save({ session });

    const newUnlock = await Unlock.create([{
      userId,
      targetId,
      onModel: targetModel,
      unlockCost: UNLOCK_COST
    }], { session });

    await Transaction.create([{
      userId,
      type: "DEBIT",
      amount: UNLOCK_COST,
      reason: `UNLOCK_${targetModel.toUpperCase()}`,
      referenceId: targetId,
      balanceAfter: user.credits
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `${targetModel} unlocked successfully`,
      data: newUnlock[0]
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllMyUnlocks = async (req, res) => {
  try {
    const { type } = req.query;
    let query = { userId: req.user.userId };
    if (type) query.onModel = type;

    const unlocks = await Unlock.find(query)
      .populate("targetId") 
      .sort("-createdAt");

    return res.status(200).json({
      success: true,
      count: unlocks.length,
      data: unlocks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTotalUnlocksForPost = async (req, res) => {
  try {
    const { targetId } = req.params;
    const count = await Unlock.countDocuments({ targetId });

    return res.status(200).json({
      success: true,
      totalUnlocks: count
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkStatus = async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user.userId;

    const unlockRecord = await Unlock.findOne({ userId, targetId });

    if (unlockRecord) {
      return res.status(200).json({
        success: true,
        isUnlocked: true,
        unlockData: unlockRecord
      });
    }

    return res.status(200).json({
      success: true,
      isUnlocked: false,
      message: "Item is locked"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLeadsForMyPost = async (req, res) => {
  try {
    const { targetId, targetModel } = req.query; 
    const ownerId = req.user.userId;

    let Model;
    if (targetModel === "Job") Model = Job;
    else if (targetModel === "Item") Model = Item;
    else Model = Business;

    const entity = await Model.findById(targetId);
    if (!entity) return res.status(404).json({ message: "Post not found" });

    const postOwner = entity.userId || entity.user;
    if (postOwner.toString() !== ownerId) {
      return res.status(403).json({ message: "Unauthorized access to these leads" });
    }

    const leads = await Unlock.find({ targetId })
      .populate("userId", "fullName mobile profilePhoto location") 
      .sort("-createdAt");

    return res.status(200).json({
      success: true,
      totalLeads: leads.length,
      leads: leads.map(l => ({
        unlockedAt: l.createdAt,
        userDetails: l.userId
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};