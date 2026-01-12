const Admin = require('../models/Admin');
const User = require("../../models/User");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Job = require("../../models/Job");

// --- REGISTER API ---
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
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- LOGIN API (Jo aapne banai thi) ---
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
                role: admin.role  // <--- Yeh line add ki hai
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.getAllAdmins = async (req, res) => {

    try {

        const admins = await Admin.find().select('-password');
        res.status(200).json(admins);

    } catch (error) {
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

   
    const totalDownloads = 0; 

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

        // Search by name filter (agar search query provide ki gayi hai)
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }

        // Saara data fetch karna jo table mein dikhana hai
        const users = await User.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
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
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// -------------------------------------------

// --- GET ALL JOBS (For Admin Table) ---
exports.getAllJobsForAdmin = async (req, res) => {
    try {
     
        const jobs = await Job.find()
            .populate('userId', 'name role') 
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- ADMIN UPDATE JOB ---
exports.adminUpdateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const updateData = req.body;

        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({ message: "Job not found" });
        }

        res.status(200).json({
            success: true,
            message: "Job updated successfully by Admin",
            data: updatedJob
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- ADMIN DELETE JOB ---
exports.adminDeleteJob = async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.id);

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        res.status(200).json({
            success: true,
            message: "Job deleted successfully by Admin"
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};