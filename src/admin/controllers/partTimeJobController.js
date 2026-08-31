const Job = require("../../models/Job");
const jobService = require("../../services/job.services");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const Admin = require("../../admin/models/Admin");
const JobUnlock = require("../../models/JobUnlock");

const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map(file =>
        cloudinary.uploader.upload(file.path, { folder: "jobs" })
    );
    const results = await Promise.all(uploadPromises);


    files.forEach(file => fs.unlinkSync(file.path));

    return results.map(result => result.secure_url);
};


exports.getJobByIdForAdmin = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, jobCategory: "PART_TIME_JOB" })
            .populate("userId", "name role email");
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminCreateJob = async (req, res) => {
    try {
        const body = req.body;
        const userId = req.user.id ;

        // 1. Upload Images to Cloudinary
        const imageUrls = await uploadFilesToCloudinary(req.files);

        // 2. Parse Location & Salary
        const lng = body.location?.coordinates?.[0] || body["location[coordinates][0]"];
        const lat = body.location?.coordinates?.[1] || body["location[coordinates][1]"];
        const address = body.location?.address || body["location[address]"];

        let salary = { min: 0, max: 0 };
        if (body.salaryRange) salary = typeof body.salaryRange === "string" ? JSON.parse(body.salaryRange) : body.salaryRange;

        const jobData = {
            ...body,
            userId,
            jobCategory: "PART_TIME_JOB",
            images: imageUrls,
            salaryRange: salary,
            location: {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)],
                address: address || ""
            },
            expiresAt: body.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        const job = await Job.create(jobData);

        const adminData =  await Admin.findById(userId).select("name role");

          if (!adminData) {
            return res.status(404).json({ success: false, message: "Admin details not found" });
        }
const finalResponseData = job.toObject();
        finalResponseData.userId = adminData;

        res.status(201).json({ 
            success: true,
             message: "Job created with images", 
             postedBy: "ADMIN",
             adminName:  adminData.name,
             adminRole:adminData.role,
             data: finalResponseData 
            });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminUpdateJob = async (req, res) => {
    try {
        const body = req.body;
        let updateData = { ...body };

        // 1. Image Update (If new images uploaded)
        if (req.files && req.files.length > 0) {
            updateData.images = await uploadFilesToCloudinary(req.files);
        }

        // 2. Location Handling
        const lng = body.location?.coordinates?.[0] || body["location[coordinates][0]"];
        const lat = body.location?.coordinates?.[1] || body["location[coordinates][1]"];
        if (lng && lat) {
            updateData.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)],
                address: body["location[address]"] || body.location?.address || ""
            };
        }

        // 3. Salary Handling
        if (body.salaryRange && typeof body.salaryRange === "string") {
            try { updateData.salaryRange = JSON.parse(body.salaryRange); } catch (e) { }
        }

        // Cleanup flat keys
        const keysToDelete = ["location[coordinates][0]", "location[coordinates][1]", "location[address]"];
        keysToDelete.forEach(key => delete updateData[key]);

        const updatedJob = await Job.findOneAndUpdate(
            { _id: req.params.id, jobCategory: "PART_TIME_JOB" },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedJob) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, message: "Job updated successfully", data: updatedJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminDeleteJob = async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({ _id: req.params.id, jobCategory: "PART_TIME_JOB" });
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, message: "Job deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllJobsForAdmin = async (req, res) => {
    try {
        const { lat, lng, radius, title , page = 1 , limit = 10} = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

const admins = await Admin.find().select("_id name role");
        const adminIds = admins.map(admin => admin._id);

           const adminMap = {};
        admins.forEach(admin => {
            adminMap[admin._id.toString()] = { name: admin.name, role: admin.role };
        });

      let query = { 
            jobCategory: "PART_TIME_JOB",
            userId: { $in: adminIds } 
        };


        if (title) {
            query.title = { $regex: title, $options: "i" };
        }

        
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const distanceInKm = parseFloat(radius) || 10;
            const radiusInRadians = distanceInKm / 6378.1;
            query.location = {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInRadians]
                }
            };
        }

        const totalJobs = await Job.countDocuments(query);


        const jobs = await Job.find(query)

            .sort({ createdAt: -1 })
              .skip(skip)
            .limit(limitNum)
            .lean();

            const populatedJobs = jobs.map(job => {
            const adminInfo = adminMap[job.userId.toString()];
            return {
                ...job,
                userId: adminInfo || { name: "Unknown Admin", role: "admin" }
            };
        });

        res.status(200).json({
            success: true,
            count: populatedJobs.length,
             pagination: {
                totalJobs,
                totalPages: Math.ceil(totalJobs / limitNum),
                currentPage: pageNum,
                pageSize:populatedJobs.length
            },
            data: populatedJobs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getRegularUserJobs = async (req, res) => {
    try {
        const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

    
        const adminIds = await Admin.find().distinct("_id");

       
        let query = { 
            jobCategory: "PART_TIME_JOB",
            userId: { $nin: adminIds }
        };

        if (title) {
            query.title = { $regex: title, $options: "i" };
        }

        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const distanceInKm = parseFloat(radius) || 10;
            const radiusInRadians = distanceInKm / 6378.1;
            query.location = {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInRadians]
                }
            };
        }

         const partTimeJobStats = await Job.aggregate([
            { $match: { jobCategory: "PART_TIME_JOB", userId: { $nin: adminIds } } },
            {
                $group: {
                    _id: null,
                    totalPartTimeJobs: { $sum: 1 },
                    activeCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                    expiredCount: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } }, 
                    featuredCount: { $sum: { $cond: ["$isFeatured", 1, 0] } }, 
                    totalPostingCredits: { $sum: "$creditsSpent" } 
                }
            }
        ]);

      
        const partTimeUnlockStats = await JobUnlock.aggregate([
            {
                $lookup: {
                    from: "jobs",
                    localField: "jobId",
                    foreignField: "_id",
                    as: "jobInfo"
                }
            },
            { $unwind: "$jobInfo" },
            { 
                $match: { 
                    "jobInfo.jobCategory": "PART_TIME_JOB", 
                    "jobInfo.userId": { $nin: adminIds } 
                } 
            },
            {
                $group: {
                    _id: null,
                    totalUnlocks: { $sum: 1 }, 
                    totalUnlockCredits: { $sum: "$creditsSpent" } 
                }
            }
        ]);

        const stats = partTimeJobStats[0] || { totalPartTimeJobs: 0, activeCount: 0, expiredCount: 0, featuredCount: 0, totalPostingCredits: 0 };
        const unlockStats = partTimeUnlockStats[0] || { totalUnlocks: 0, totalUnlockCredits: 0 };

        const totalJobs = await Job.countDocuments(query);

        const jobs = await Job.find(query)
            .populate("userId", "fullName role profilePhoto mobile") 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

const jobsWithUnlockDetails = await Promise.all(
            jobs.map(async (job) => {
                const unlocks = await JobUnlock.find({ jobId: job._id })
                    .populate("userId", "fullName profilePhoto mobile email role") 
                    .lean();

                return {
                    ...job,
                    jobUnlockCount: unlocks.length,
                    unlockedByUsers: unlocks.map(u => u.userId) 
                };
            })
        );

        res.status(200).json({
            success: true,
            analytics: {
                totalPartTimeJobs: stats.totalPartTimeJobs,
                activeJobs: stats.activeCount,
                expiredJobs: stats.expiredCount,
                featuredJobs: stats.featuredCount,
                totalUnlocksAcrossAllJobs: unlockStats.totalUnlocks,
                credits: {
                    postingCreditsSpent: stats.totalPostingCredits,
                    unlockCreditsSpent: unlockStats.totalUnlockCredits,
                    totalCreditsSpent: stats.totalPostingCredits + unlockStats.totalUnlockCredits
                }
            },
            pagination: {
                totalJobs,
                totalPages: Math.ceil(totalJobs / limitNum),
                currentPage: pageNum,
                pageSize: jobs.length
            },
            data: jobsWithUnlockDetails
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

