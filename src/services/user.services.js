const User = require("../models/user");

exports.registerUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};


exports.getAllUsers = async () => {
  return await User.find();
};

exports.deleteUserById = async(userId) =>{
  //Delete user by Id
 return await User.findByIdAndDelete(userId);

}


exports.updateUserById = async (userId, updateData) => {
  // Delete mobile field if exists in updateData
  if (updateData.mobile) {
    delete updateData.mobile;
  }

  return await User.findByIdAndUpdate(userId, updateData, { new: true });
};