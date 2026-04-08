const User = require("../../models/User");

 const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-token -fcmToken -__v");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch users",
      error: error.message,
    });
  }
};

module.exports = {getAllUsers}