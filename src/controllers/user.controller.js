const jwt = require("jsonwebtoken");
const response = require("../utils/response");
const userService = require("../services/user.services");
const cloudinary = require("../config/cloudinary");
const couponService = require('../services/coupon.services');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const fs = require("fs");
const { sendPushToUser } = require("../services/notification.service");
const Displayimage = require('../models/DisplayPhoto')

exports.register = async (req, res) => {
  try {
    const body = { ...req.body }; 
    const { mobile, latitude, longitude, address, ...restBody } = body;
    console.log(mobile, latitude, longitude, address, restBody )

    if (!mobile) {
      return response.error(res, "Mobile number is required", 400);
    }

    const existingUser = await userService.findUserByMobile(mobile);
    if (existingUser) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return response.error(
        res,
        "User already registered with this mobile number",
        409,
      );
    }

    let profilePhotoUrl = null;

    if (req.file) {
      const localFilePath = req.file.path;
      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: "user_profiles",
      });
      profilePhotoUrl = uploadResult.secure_url;
      fs.unlinkSync(localFilePath);
    }

    const userData = {
      ...restBody,
      mobile,
      profilePhoto: profilePhotoUrl,
      ...(address && { address }), 
      credits:100
    };

    const lat = latitude;
    const lng = longitude;
    if (lat && lng && String(lat).trim() !== "" && String(lng).trim() !== "") {
      userData.location = {
        type: "Point",

        coordinates: [Number(lng), Number(lat)],
      };
    }
    const user = await userService.registerUser(userData);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    // 4️⃣ Store token in DB
    user.token = token;
    await user.save();

    return response.success(res, "User Registered Successfully", {
      user,
      token,
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return response.error(res, err.message || "Something went wrong", 500);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Include role in selection for admin to identify who they are creating the job for
    const users = await userService.getAllUsers();
    return response.success(res, "Users fetched successfully", users);
  } catch (err) {
    console.error(err);
    return response.error(res, err.message || "Something went wrong", 500);
  }
};

// --------------------------------------------------
// Delete User
// --------------------------------------------------
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await userService.deleteUserById(id);

    if (!deletedUser) {
      return response.error(res, "User not found", 404);
    }

    return response.success(res, "User deleted successfully", deletedUser);
  } catch (err) {
    console.error(err);
    return response.error(res, err.message || "Something went wrong", 500);
  }
};

// --------------------------------------------------
// Update User
// --------------------------------------------------
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "ADMIN" && req.user.userId !== id) {
      return response.error(res, "You are not authorized", 403);
    }

    let profilePhotoUrl = null;

    if (req.file) {cl
      const localFilePath = req.file.path;
      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: "user_profiles",
      });
      profilePhotoUrl = uploadResult.secure_url;
      fs.unlinkSync(localFilePath);
    }

    const updateData = { ...req.body };

    
    if (updateData.latitude && updateData.longitude) {
      updateData.location = {
        type: "Point",
    
        coordinates: [
          Number(updateData.longitude),
          Number(updateData.latitude),
        ],
      };
    } else if (updateData.latitude || updateData.longitude) {
      delete updateData.location;
    }

    if (profilePhotoUrl) {
      updateData.profilePhoto = profilePhotoUrl;
    }

    delete updateData.mobile;
    delete updateData.latitude;
    delete updateData.longitude;

    const updatedUser = await userService.updateUserById(id, updateData);

    if (!updatedUser) {
      return response.error(res, "User not found", 404);
    }

    return response.success(res, "User updated successfully", updatedUser);
  } catch (err) {
    console.error(err);
    return response.error(res, err.message || "Something went wrong", 500);
  }
};



exports.applyCoupon = async (req, res) => {
    try {
        
        const userId = req.user.userId; 
        const { couponCode } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const result = await couponService.applyCouponService(userId, couponCode);

        res.status(200).json({
            success: true,
            message: `Congratulations! ${result.addedCredits} credits added.`,
            newBalance: result.totalCredits
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};



exports.getWalletDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('credits name mobile');

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.status(200).json({
            success: true,
            data: {
                availableBalance: user.credits || 0,
                userName: user.name,
                userMobile: user.mobile
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getAvailableCoupons = async (req, res) => {
    try {
        const userId = req.user.userId;

        
        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gt: new Date() },
            "usedBy.user": { $ne: userId } 
        }).select('code credits expiryDate');

        res.status(200).json({
            success: true,
            message: "Available offers fetched successfully",
            count: coupons.length,
            coupons
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.updateFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ message: "UserId and fcmToken are required" });
    }

    // Update the fcmToken field specifically
    await User.findByIdAndUpdate(userId, { fcmToken: fcmToken });

    res.status(200).json({ success: true, message: "FCM Token updated" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



exports.sendNotificationTest = async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    
    const result = await sendPushToUser(userId, title, message);
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.homeScreenImages = async (req, res)=>{
  try{

   const images = await Displayimage.find().select("photo");
    res.status(200).json({
      success : true,
      images,
      message: "fetched successfully"
    })

  }catch(error){
    res.status(500).json({ success: false, error: error.message });
    
  }
}