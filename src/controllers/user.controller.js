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
const bcrypt = require("bcryptjs");
const NotificationService = require("../services/notificationService");
const PlanConfig = require("../models/PlanConfig");
const admin = require("../config/firebase");
const moment = require("moment");


exports.register = async (req, res) => {
  try {
    const body = { ...req.body };
    const { mobile, email, latitude,password, longitude, address, ...restBody } = body;
    console.log(mobile, latitude, longitude, address, restBody)


  if (!mobile || !email) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return response.error(res, "Mobile number and email are required", 400);
    }

    const existingEmail = await User.findOne({ email }); 
    if (existingEmail) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return response.error(res, "User already registered with this email address", 409);
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


     let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
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
      email,
      ...(hashedPassword && { password: hashedPassword }), 
      profilePhoto: profilePhotoUrl,
      ...(address && { address }),
      credits: 100
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


    const userResponse = user.toObject();
    delete userResponse.password;

    return response.success(res, "User Registered Successfully", {
      user: userResponse,
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



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return response.error(res, "Email and password are required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return response.error(res, "Invalid email or password", 401);
    }
    if (user.status === "Blocked") {
      return response.error(res, "Your account has been blocked. Contact support.", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return response.error(res, "Invalid email or password", 401);
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    user.token = token;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    return response.success(res, "Login successful", {
      user: userResponse,
      token
    });

  } catch (err) {
    console.error("Login Error:", err);
    return response.error(res, "Something went wrong during login", 500);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
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

      console.log("File received:", req.file); 

    if (req.file) {
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
    delete updateData.password;

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


exports.updateFCMToken = async (req, res) => {
  try {
    
    const { fcmToken } = req.body;
    const userId = req.user.userId;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM Token is required"
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fcmToken: fcmToken },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("DEBUG: Syncing for user:", updatedUser.fullName);
    console.log("DEBUG: Gender:", updatedUser.gender);
    console.log("DEBUG: BloodGroup:", updatedUser.bloodGroup);


   await  NotificationService.syncUserTopics(fcmToken, updatedUser);
    return res.status(200).json({
      success: true,
      message: "FCM Token updated successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


  
exports.homeScreenImages = async (req, res) => {
  try {

    const images = await Displayimage.find().select("photo");
    res.status(200).json({
      success: true,
      images,
      message: "fetched successfully"
    })

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });

  }
}


exports.getPlansForUser = async (req, res) => {
  try {
    const allPlans = await PlanConfig.find().sort({ price: 1 });

    const creditPacks = allPlans.filter(p => p.category === 'CREDIT');
    const subscriptionPlans = allPlans.filter(p => p.category === 'SUBSCRIPTION');

    res.status(200).json({
      success: true,
      data: {
        screen1_wallet: creditPacks,      
        screen2_shopPlans: subscriptionPlans 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await PlanConfig.findOne({ planId });
    
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.verifyOTP = async (req, res) => {
  try {
    const { idToken, mobile } = req.body;

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseMobile = decodedToken.phone_number;

    if (!firebaseMobile.endsWith(mobile.slice(-10))) {
      return res.status(400).json({
        success: false,
        message: "Mobile number mismatch with token"
      });
    }

    const user = await User.findOne({ mobile: firebaseMobile });

    const responseData = {
      firebaseData: decodedToken,
      isNewUser: !user
    };

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "OTP Verified. User not found in DB, please register.",
        data: {
          ...responseData,
          user: null
        }
      });
    }

    const appToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        ...responseData,
        token: appToken,
        user: user
      }
    });

  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message
    });
  }
};

exports.getUserGrowthStats = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id ||req.user.userId;

    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID found" });
    }


    const { filter } = req.query; 

    let startDate, endDate, format, unit;

    // Filter logic
    if (filter === "weekly") {
      startDate = moment().subtract(7, "days").startOf("day");
      endDate = moment().endOf("day");
      format = "%Y-%m-%d";
      unit = "days";
    } else if (filter === "yearly") {
      startDate = moment().subtract(1, "year").startOf("month");
      endDate = moment().endOf("month");
      format = "%Y-%m";
      unit = "months";
    } else {
      startDate = moment().subtract(30, "days").startOf("day");
      endDate = moment().endOf("day");
      format = "%Y-%m-%d";
      unit = "days";
    }

    const stats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: format, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const resultData = [];
    const labels = [];
    let current = moment(startDate);

    while (current <= endDate) {
      const dateStr = current.format(unit === "months" ? "YYYY-MM" : "YYYY-MM-DD");
      const labelStr = current.format(unit === "months" ? "MMM YYYY" : "MMM DD");
      
      const found = stats.find((item) => item._id === dateStr);
      
      labels.push(labelStr);
      resultData.push(found ? found.count : 0);
      
      current.add(1, unit);
    }

    res.status(200).json({
      success: true,
      requestedBy: adminId, 
      labels,
      data: resultData,
      totalUsersInRange: resultData.reduce((a, b) => a + b, 0),
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.getUserSummaryStats = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id || req.user.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const stats = await User.aggregate([
      {
        $facet: {
          statusCount: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          roleCount: [
            { $group: { _id: "$role", count: { $sum: 1 } } }
          ],
          genderCount: [
            { $group: { _id: "$gender", count: { $sum: 1 } } }
          ],
          // 4. Total Users
          total: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const formatStats = (arr) => {
      return arr.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});
    };

    res.status(200).json({
      success: true,
      data: {
        totalUsers: stats[0].total[0]?.count || 0,
        byStatus: formatStats(stats[0].statusCount),
        byRole: formatStats(stats[0].roleCount),
        byGender: formatStats(stats[0].genderCount)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};