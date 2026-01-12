const User = require("../models/User");

exports.findUserByMobile = async (mobile) => {
  return await User.findOne({ mobile });
};

exports.findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

exports.registerUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

exports.getAllUsers = async () => {
  return await User.find();
};

exports.deleteUserById = async (userId) => {
  return await User.findByIdAndDelete(userId);
};

exports.updateUserById = async (userId, updateData) => {
  if (updateData.mobile) delete updateData.mobile;
  return await User.findByIdAndUpdate(userId, updateData, { new: true });
};
