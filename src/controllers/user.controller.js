// const jwt = require("jsonwebtoken");
// const response = require("../utils/response");
// const userService = require("../services/user.services");
// const cloudinary = require("../config/cloudinary");
// const fs = require("fs");

// // --------------------------------------------------
// // Register New User Controller
// // Handles user creation, image upload & JWT token
// // --------------------------------------------------
// exports.register = async (req, res) => {
//   try {
//     const { mobile } = req.body;

//     if (!mobile) {
//       return response.error(res, "Mobile number is required", 400);
//     }

//     //  MOBILE BASED CHECK
//     const existingUser = await userService.findUserByMobile(mobile);

//     if (existingUser) {
//       if (req.file && fs.existsSync(req.file.path)) {
//         fs.unlinkSync(req.file.path);
//       }
//       return response.error(
//         res,
//         "User already registered with this mobile number",
//         409
//       );
//     }

//     let profilePhotoUrl = null;

//     if (req.file) {
//       const localFilePath = req.file.path;
//       const uploadResult = await cloudinary.uploader.upload(localFilePath, {
//         folder: "user_profiles",
//       });
//       profilePhotoUrl = uploadResult.secure_url;
//       fs.unlinkSync(localFilePath);
//     }

//     const userData = {
//       ...req.body,
//       profilePhoto: profilePhotoUrl,
//     };

//     const user = await userService.registerUser(userData);

//     const token = jwt.sign(
//       { userId: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN }
//     );

//     return response.success(res, "User Registered Successfully", {
//       user,
//       token,
//     });
//   } catch (err) {
//     console.error(err);
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//     return response.error(res, err.message || "Something went wrong", 500);
//   }
// };


// // --------------------------------------------------
// // Get All Users Controller
// // Fetches all users from database
// // --------------------------------------------------
// exports.getAllUsers = async (req, res) => {
//   try {
//     const users = await userService.getAllUsers();

//     // Send success response
//     return response.success(res, "Users fetched successfully", users);
//   } catch (err) {
//     console.error(err);
//     return response.error(res, err.message || "Something went wrong", 500);
//   }
// };

// // --------------------------------------------------
// // Delete User Controller
// // Delete User By Id
// // --------------------------------------------------
// exports.deleteUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedUser = await userService.deleteUserById(id);

//     if (!deletedUser) {
//       return response.error(res, "User not found", 404);
//     }

//     return response.success(res, "User deleted successfully", deletedUser);
//   } catch (err) {
//     console.error(err);
//     return response.error(res, err.message || "Something went wrong", 500);
//   }
// };

// // --------------------------------------------------
// // Update User Controller
// // --------------------------------------------------
// exports.updateUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Authorization: only admin or the user themselves
//     if (req.user.role !== "ADMIN" && req.user.userId !== id) {
//       return response.error(res, "You are not authorized to update this user", 403);
//     }

//     let profilePhotoUrl = null;

//     // If new profile photo uploaded, upload to Cloudinary
//     if (req.file) {
//       const localFilePath = req.file.path;

//       const uploadResult = await cloudinary.uploader.upload(localFilePath, {
//         folder: "user_profiles",
//       });

//       profilePhotoUrl = uploadResult.secure_url;

//       // Remove local file
//       fs.unlinkSync(localFilePath);
//     }

//     // Prepare update data, mobile excluded
//     const updateData = { ...req.body };
//     if (profilePhotoUrl) {
//       updateData.profilePhoto = profilePhotoUrl;
//     }
//     if (updateData.mobile) {
//       delete updateData.mobile; // ensure mobile cannot be updated
//     }

//     const updatedUser = await userService.updateUserById(id, updateData);

//     if (!updatedUser) {
//       return response.error(res, "User not found", 404);
//     }

//     return response.success(res, "User updated successfully", updatedUser);
//   } catch (err) {
//     console.error(err);
//     return response.error(res, err.message || "Something went wrong", 500);
//   }
// };

const jwt = require("jsonwebtoken");
const response = require("../utils/response");
const userService = require("../services/user.services");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// --------------------------------------------------
// Register New User
// --------------------------------------------------
exports.register = async (req, res) => {
  try {
    const { mobile, latitude, longitude, address } = req.body;

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

    const { latitude: lat, longitude: lng, ...rest } = req.body;

    const userData = {
      ...rest,
      profilePhoto: profilePhotoUrl,
      location: lat && lng
        ? {
            type: "Point",
            coordinates: [Number(lng), Number(lat)], // ✅ FIX
            address,
          }
        : undefined,
    };

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

// --------------------------------------------------
// Get All Users
// --------------------------------------------------
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

    if (req.file) {
      const localFilePath = req.file.path;
      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: "user_profiles",
      });
      profilePhotoUrl = uploadResult.secure_url;
      fs.unlinkSync(localFilePath);
    }

    const updateData = { ...req.body };

    if (req.body.latitude && req.body.longitude) {
      updateData.location = {
        type: "Point",
        coordinates: [req.body.longitude, req.body.latitude],
        address: req.body.address,
      };
    }

    if (profilePhotoUrl) {
      updateData.profilePhoto = profilePhotoUrl;
    }

    delete updateData.mobile;
    delete updateData.latitude;
    delete updateData.longitude;
    delete updateData.address;

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
