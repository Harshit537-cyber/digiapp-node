
const jwt = require("jsonwebtoken");
const response = require("../utils/response");
const userService = require("../services/user.services");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");


exports.register = async (req, res) => {
  try {
   
    const { mobile, latitude, longitude, address, ...restBody } = req.body;

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
        409
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
      ...(address && { address }), // Add address if present
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
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

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
    const users = await userService.getAllUsers().select('name mobile role'); 
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

    if (req.file) {
      const localFilePath = req.file.path;
      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: "user_profiles",
      });
      profilePhotoUrl = uploadResult.secure_url;
      fs.unlinkSync(localFilePath);
    }

    const updateData = { ...req.body };

    // Update location only if both latitude and longitude are provided
    if (updateData.latitude && updateData.longitude) {
      updateData.location = {
        type: "Point",
        // Ensure coordinates are numbers and in [lng, lat] order
        coordinates: [Number(updateData.longitude), Number(updateData.latitude)],
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
