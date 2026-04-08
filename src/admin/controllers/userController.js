const User = require("../../models/User");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const response = require("../../utils/response")


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


const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    const { mobile, latitude, longitude, address, ...restBody } = body;

    const user = await User.findById(id);
    if (!user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return response.error(res, "User not found", 404);
    }

    let profilePhotoUrl = user.profilePhoto;

    if (req.file) {
  
      if (user.profilePhoto) {
        const publicId = user.profilePhoto.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`user_profiles/${publicId}`).catch(err => console.log("Old photo delete failed:", err));
      }

      // --- UPLOAD NEW IMAGE ---
      const localFilePath = req.file.path;
      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: "user_profiles",
      });
      
      profilePhotoUrl = uploadResult.secure_url;

      // Clean up local temp file
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }

    // 3. Prepare Update Data
    const updateData = {
      ...restBody,
      profilePhoto: profilePhotoUrl,
      mobile: mobile || user.mobile,
      ...(address && { address }),
    };

    // 4. Handle Location
    if (latitude && longitude && String(latitude).trim() !== "" && String(longitude).trim() !== "") {
      updateData.location = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      };
    }

    // 5. Save to Database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return response.success(res, "Profile updated successfully with Cloudinary", {
      user: updatedUser,
    });

  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return response.error(res, err.message || "Something went wrong", 500);
  }
};


const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find user in the database
    const user = await User.findById(id);

    if (!user) {
      return response.error(res, "User not found", 404);
    }

    // 2. If user has a photo, delete it from Cloudinary first
    if (user.profilePhoto) {
      try {
        const publicId = user.profilePhoto.split("/").pop().split(".")[0];
        
        await cloudinary.uploader.destroy(`user_profiles/${publicId}`);
      } catch (cloudErr) {
        console.error("Cloudinary deletion failed:", cloudErr);
      }
    }
    await User.findByIdAndDelete(id);

    return response.success(res, "User deleted from database and Cloudinary successfully", null);
  } catch (err) {
    console.error(err);
    return response.error(res, err.message || "Internal Server Error", 500);
  }
};



const searchUserByName = async (req, res) => {
  try {
    const { name } = req.query; 

    if (!name) {
      return response.error(res, "Please provide a name to search", 400);
    }
    const users = await User.find({
      fullName: { $regex: name, $options: "i" }
    }).select("-token -fcmToken -__v"); 

    return response.success(res, `Found ${users.length} users`, users);
  } catch (err) {
    console.error(err);
    return response.error(res, err.message || "Something went wrong", 500);
  }
}; 


module.exports = {getAllUsers, updateProfile, deleteUser, searchUserByName};