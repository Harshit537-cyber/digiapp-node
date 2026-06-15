const User = require("../models/User");
const transactionSchema = require('../models/Transitionmodel')

exports.findUserByMobile = async (mobile) => {
  return await User.findOne({ mobile });
};

exports.findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

exports.registerUser = async (userData) => {
  const user = new User(userData);
  // return await user.save();
   // Save user first
  const savedUser = await user.save();

  // 🔥 Add transaction entry for signup bonus
  await transactionSchema.create({
    userId: savedUser._id,
    type: "CREDIT",
    amount: 100,
    reason: "SIGNUP_BONUS",
    balanceAfter: savedUser.credits
  });

  return savedUser;
};

exports.getAllUsers = async () => {
  return await User.find().select("fullName mobile role");
};

exports.deleteUserById = async (userId) => {
  return await User.findByIdAndDelete(userId);
};



exports.updateUserById = async (userId, updateData) => {
  if (updateData.mobile) delete updateData.mobile;
  return await User.findByIdAndUpdate(userId, updateData, { new: true });
};



