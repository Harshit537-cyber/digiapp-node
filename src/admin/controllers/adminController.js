const Admin = require('../models/Admin');
const User = require("../../models/User"); // Ensure User model is correctly imported
const Job = require("../../models/Job"); // Kept as is for context
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require("fs"); // Added for file system operations
const upload = require("../../middlewares/upload"); // Correct path based on your adminController.js location
const cloudinary = require("../../config/cloudinary"); // Correct path based on your adminController.js location
const Displayimage = require('../../models/DisplayPhoto')

// --- REGISTER API (For Admins) ---
exports.adminRegister = async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = new Admin({
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();

        res.status(201).json({
            message: "Admin registered successfully",
            admin: { id: newAdmin._id, email: newAdmin.email }
        });

    } catch (error) {
        console.error("Error in adminRegister:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- LOGIN API (For Admins) ---
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role }, // Payload mein role add kiya
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Response mein role add kar diya gaya hai
        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Error in adminLogin:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.getAllAdmins = async (req, res) => {

    try {

        const admins = await Admin.find().select('-password');
        res.status(200).json(admins);

    } catch (error) {
        console.error("Error in getAllAdmins:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }

}


exports.updateAdmin = async (req, res) => {

    try {

        const { email, password, role } = req.body;

        const updateData = {};

        if (email) updateData.email = email;
        if (role) updateData.role = role;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(

            req.params.id,
            { $set: updateData },
            { new: true }

        ).select('-password');


        if (!updatedAdmin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ message: "Admin updated successfully", admin: updatedAdmin });


    } catch (error) {
        console.error("Error in updateAdmin:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }

}


// --- DELETE ADMIN ---
exports.deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findByIdAndDelete(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ message: "Admin deleted successfully" });
    } catch (error) {
        console.error("Error in deleteAdmin:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};




exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total Users
    const totalUsers = await User.countDocuments();

    // 2. New Today (Users joined in last 24 hours)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newToday = await User.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // 3. Active Now (Users who did something in the last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeNow = await User.countDocuments({
      updatedAt: { $gte: fifteenMinutesAgo },
    });

    // 4. Monthly Active (Users active in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyActive = await User.countDocuments({
      updatedAt: { $gte: thirtyDaysAgo },
    });

    const totalDownloads = 0; // Placeholder

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newToday,
        activeNow,
        monthlyActive,
        totalDownloads
      }
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


//forAdmin

exports.getAllUsersForAdmin = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        // Search by fullName (Case-insensitive search)
        if (search) {
            query.fullName = { $regex: search, $options: 'i' };
        }

        // Fetch all user data
        const users = await User.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error("Error in getAllUsersForAdmin:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- BLOCK / UNBLOCK USER ---
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.status = user.status === 'Active' ? 'Blocked' : 'Active';

        await user.save();

        res.status(200).json({
            success: true,
            message: `User status changed to ${user.status}`,
            data: user
        });
    } catch (error) {
        console.error("Error in toggleUserStatus:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- NEW: CREATE USER BY ADMIN (Adapted for UserSchema and image upload) ---
exports.createUserByAdmin = async (req, res) => {
    console.log("----- createUserByAdmin called -----");
    console.log("Request Body:", req.body);
    console.log("Request File:", req.file); 

    let profilePhoto = '';
   
    let uploadedFilePath = req.file ? req.file.path : null;

    try {
        const { mobile, fullName, gender, role } = req.body;
        const {
            location, address, city, state, country,
            bloodGroup, status = 'Active', credits = 0, isVerified = false
        } = req.body;
        

        // Handle image upload if a file is provided
        if (req.file) {
            console.log("File detected for upload. Path:", req.file.path);
            console.log("Does file exist at Multer path before Cloudinary upload?", fs.existsSync(req.file.path));

            if (!fs.existsSync(req.file.path)) {
                console.error("ERROR: File does not exist at path before Cloudinary upload:", req.file.path);
               
                return res.status(500).json({ message: "Server Error: Uploaded file not found on disk." });
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "user_profile_photos", // Specify a folder in Cloudinary
            });
            profilePhoto = result.secure_url;
            console.log("Cloudinary upload successful. URL:", profilePhoto);
            
            // Delete the local file after uploading to Cloudinary
            console.log("Attempting to delete local file:", req.file.path);
            if (fs.existsSync(req.file.path)) { // Check again before attempting to delete
                try {
                    fs.unlinkSync(req.file.path);
                    console.log("Local file deleted successfully.");
                    uploadedFilePath = null; // Mark as deleted
                } catch (unlinkError) {
                    console.error("Error deleting local file after Cloudinary upload:", unlinkError.message);
                    
                }
            } else {
                console.warn("Local file not found for deletion after Cloudinary upload, it might have been deleted already.");
            }
        }

        // Validate required fields
        if (!mobile || !fullName || !gender || !role) {
            return res.status(400).json({ message: "Mobile, fullName, gender, and role are required." });
        }

        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({ message: "User with this mobile number already exists" });
        }

        const newUser = new User({
            mobile,
            fullName,
            gender,
            role,
            location: location ? JSON.parse(location) : undefined, // Assuming location comes as a stringified GeoJSON object
            address,
            city,
            state,
            country,
            profilePhoto, // Set the Cloudinary URL here
            bloodGroup,
            status,
            credits,
            isVerified
        });

        await newUser.save();
        console.log("New user saved to DB:", newUser._id);

        res.status(201).json({
            success: true,
            message: "User created successfully by admin",
            user: newUser
        });

    } catch (error) {
        console.error("Error in createUserByAdmin:", error);
        // Clean up uploaded file in case of any error during processing
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log("Local file cleaned up in error handler.");
            } catch (unlinkError) {
                console.error("Failed to unlink local file in error handler:", unlinkError.message);
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", error: error.message });
        }
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- NEW: UPDATE USER BY ADMIN (Adapted for UserSchema and image upload) ---
exports.updateUserByAdmin = async (req, res) => {
    console.log("----- updateUserByAdmin called -----");
    console.log("Request Body:", req.body);
    console.log("Request File:", req.file);

    const userId = req.params.id;
    const updateData = {};
    let uploadedFilePath = req.file ? req.file.path : null;

    try {
        const {
            mobile, fullName, gender, location, address, city, state, country,
            role, bloodGroup, status, credits, isVerified
        } = req.body;

        if (mobile) updateData.mobile = mobile;
        if (fullName) updateData.fullName = fullName;
        if (gender) updateData.gender = gender;
        if (location) updateData.location = JSON.parse(location); // Assuming location comes as a stringified GeoJSON object
        if (address) updateData.address = address;
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (country) updateData.country = country;
        if (role) updateData.role = role;
        if (bloodGroup) updateData.bloodGroup = bloodGroup;
        if (status) updateData.status = status;
        if (credits !== undefined) updateData.credits = credits;
        if (isVerified !== undefined) updateData.isVerified = isVerified;

        const user = await User.findById(userId);
        if (!user) {
            // Clean up uploaded file if user not found
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                try {
                    fs.unlinkSync(uploadedFilePath);
                    console.log("Local file cleaned up (user not found).");
                } catch (unlinkError) {
                    console.error("Failed to unlink local file (user not found):", unlinkError.message);
                }
            }
            return res.status(404).json({ message: "User not found" });
        }

        // Handle image upload if a new file is provided
        if (req.file) {
            console.log("New file detected for upload. Path:", req.file.path);
            console.log("Does file exist at Multer path before Cloudinary upload?", fs.existsSync(req.file.path));

            if (!fs.existsSync(req.file.path)) {
                console.error("ERROR: New file does not exist at path before Cloudinary upload:", req.file.path);
                return res.status(500).json({ message: "Server Error: Uploaded file not found on disk." });
            }

            // If an old profile photo exists, delete it from Cloudinary
            if (user.profilePhoto) {
                console.log("Old profile photo found. Attempting to delete from Cloudinary.");
                const publicId = user.profilePhoto.split('/').pop().split('.')[0];
                try {
                    await cloudinary.uploader.destroy(`user_profile_photos/${publicId}`);
                    console.log("Old Cloudinary image deleted successfully.");
                } catch (cloudinaryError) {
                    console.error("Error deleting old Cloudinary image:", cloudinaryError.message);
                }
            }
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "user_profile_photos",
            });
            updateData.profilePhoto = result.secure_url;
            console.log("New Cloudinary upload successful. URL:", updateData.profilePhoto);

            // Delete the local file after uploading to Cloudinary
            console.log("Attempting to delete local file:", req.file.path);
            if (fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log("Local file deleted successfully.");
                    uploadedFilePath = null; // Mark as deleted
                } catch (unlinkError) {
                    console.error("Error deleting local file after Cloudinary upload (update):", unlinkError.message);
                }
            } else {
                console.warn("Local file not found for deletion after Cloudinary upload (update), it might have been deleted already.");
            }
        } else if (req.body.profilePhoto === '' && user.profilePhoto) { // Explicit request to remove existing photo
             console.log("Explicit request to remove existing profile photo.");
             const publicId = user.profilePhoto.split('/').pop().split('.')[0];
             try {
                 await cloudinary.uploader.destroy(`user_profile_photos/${publicId}`);
                 console.log("Old Cloudinary image deleted (explicit remove) successfully.");
             } catch (cloudinaryError) {
                 console.error("Error deleting old Cloudinary image (explicit remove):", cloudinaryError.message);
             }
             updateData.profilePhoto = ''; // Clear the profilePhoto field in the database
        }


        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        console.log("User updated in DB:", updatedUser._id);

        res.status(200).json({
            success: true,
            message: "User updated successfully by admin",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error in updateUserByAdmin:", error);
       
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log("Local file cleaned up in error handler.");
            } catch (unlinkError) {
                console.error("Failed to unlink local file in error handler:", unlinkError.message);
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", error: error.message });
        }
        if (error.code === 11000) { // Duplicate key error (e.g., mobile)
             return res.status(400).json({ message: "Duplicate mobile number", error: error.message });
        }
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- NEW: DELETE USER BY ADMIN ---
exports.deleteUserByAdmin = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

       
        if (user.profilePhoto) {
            console.log("Deleting Cloudinary profile photo for user:", user._id);
            const publicId = user.profilePhoto.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`user_profile_photos/${publicId}`);
                console.log("Cloudinary profile photo deleted successfully.");
            } catch (cloudinaryError) {
                console.error("Error deleting Cloudinary profile photo:", cloudinaryError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully by admin"
        });
    } catch (error) {
        console.error("Error in deleteUserByAdmin:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Assuming you have these for jobs, keeping them as is for context.
exports.getAllJobsForAdmin = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        console.error("Error in getAllJobsForAdmin:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.adminUpdateJob = async (req, res) => {
    console.log("----- adminUpdateJob called -----");
    console.log("Request Body:", req.body);
    console.log("Request File:", req.file);

    const { id } = req.params;
    const updateData = { ...req.body }; // Start with all body fields
    let uploadedFilePath = req.file ? req.file.path : null;

    try {
        const job = await Job.findById(id);
        if (!job) {
             if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                try {
                    fs.unlinkSync(uploadedFilePath);
                    console.log("Local job file cleaned up (job not found).");
                } catch (unlinkError) {
                    console.error("Failed to unlink local job file (job not found):", unlinkError.message);
                }
            }
            return res.status(404).json({ message: "Job not found" });
        }

        // Handle image upload if a new file is provided for the job
        if (req.file) {
            console.log("New file detected for job upload. Path:", req.file.path);
            console.log("Does file exist at Multer path before Cloudinary upload?", fs.existsSync(req.file.path));

            if (!fs.existsSync(req.file.path)) {
                console.error("ERROR: New job file does not exist at path before Cloudinary upload:", req.file.path);
                return res.status(500).json({ message: "Server Error: Uploaded job file not found on disk." });
            }

            // If an old job image exists, delete it from Cloudinary
            if (job.jobImage) { // Assuming 'jobImage' is the field name in your Job model
                console.log("Old job image found. Attempting to delete from Cloudinary.");
                const publicId = job.jobImage.split('/').pop().split('.')[0];
                try {
                    await cloudinary.uploader.destroy(`job_images/${publicId}`); // Specify a folder for job images
                    console.log("Old Cloudinary job image deleted successfully.");
                } catch (cloudinaryError) {
                    console.error("Error deleting old Cloudinary job image:", cloudinaryError.message);
                }
            }
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "job_images", // Specify a folder in Cloudinary
            });
            updateData.jobImage = result.secure_url; // Assuming 'jobImage' is the field name
            console.log("New Cloudinary job upload successful. URL:", updateData.jobImage);

            // Delete the local file after uploading to Cloudinary
            console.log("Attempting to delete local job file:", req.file.path);
            if (fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log("Local job file deleted successfully.");
                    uploadedFilePath = null; // Mark as deleted
                } catch (unlinkError) {
                    console.error("Error deleting local job file after Cloudinary upload (update):", unlinkError.message);
                }
            } else {
                console.warn("Local job file not found for deletion after Cloudinary upload (update), it might have been deleted already.");
            }
        } else if (req.body.jobImage === '' && job.jobImage) { // Explicit request to remove existing photo
            console.log("Explicit request to remove existing job image.");
            const publicId = job.jobImage.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`job_images/${publicId}`);
                console.log("Old Cloudinary job image deleted (explicit remove) successfully.");
            } catch (cloudinaryError) {
                console.error("Error deleting old Cloudinary job image (explicit remove):", cloudinaryError.message);
            }
            updateData.jobImage = ''; // Clear the jobImage field in the database
        }

        const updatedJob = await Job.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        console.log("Job updated in DB:", updatedJob._id);

        res.status(200).json({
            success: true,
            message: "Job updated successfully",
            data: updatedJob
        });
    } catch (error) {
        console.error("Error in adminUpdateJob:", error);
        // Clean up uploaded file in case of any error
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log("Local job file cleaned up in error handler.");
            } catch (unlinkError) {
                console.error("Failed to unlink local job file in error handler:", unlinkError.message);
            }
        }
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- NEW: DELETE JOB BY ADMIN (with image deletion) ---
exports.adminDeleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedJob = await Job.findByIdAndDelete(id);

        if (!deletedJob) {
            return res.status(404).json({ message: "Job not found" });
        }

        
        if (deletedJob.jobImage) { 
            console.log("Deleting Cloudinary job image for job:", deletedJob._id);
            const publicId = deletedJob.jobImage.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`job_images/${publicId}`);
                console.log("Cloudinary job image deleted successfully.");
            } catch (cloudinaryError) {
                console.error("Error deleting Cloudinary job image:", cloudinaryError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Job deleted successfully"
        });
    } catch (error) {
        console.error("Error in adminDeleteJob:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.displayImage = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    // Convert files to array of paths
    const imagePaths = req.files.map(file => 
      `uploads/${file.filename}`
    );

    // Check if document already exists
    let existing = await Displayimage.findOne({ userId });

    if (existing) {
      // Add new images to existing array
      existing.photo.push(...imagePaths);  // spread is important
      await existing.save();

      return res.json({
        success: true,
        message: "Images added successfully",
        data: existing
      });

    } else {
      // Create new document
      const newImageDoc = await Displayimage.create({
        userId,
        photo: imagePaths   // DO NOT wrap inside []
      });

      return res.json({
        success: true,
        message: "Images saved successfully",
        data: newImageDoc
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};