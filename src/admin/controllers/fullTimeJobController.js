const Job = require("../../models/Job");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");
const Admin = require("../../admin/models/Admin");
const User = require("../../models/User");
const JobUnlock = require("../../models/JobUnlock");
const JobsCategory = require("../../admin/models/JobsCategory");
const getSingleValue = (val) => Array.isArray(val) ? val[0] : val;

const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map(file => 
        cloudinary.uploader.upload(file.path, { folder: "full-time-jobs" })
    );
    const results = await Promise.all(uploadPromises);
    files.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path)); 
    return results.map(result => result.secure_url);
};

exports.getAllFullTimeJobs = async (req, res) => {
    try {
        const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

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
            jobCategory: "FULL_TIME_JOB",
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
            const adminInfo = adminMap[job.userId ? job.userId.toString() : ""];
            return {
                ...job,
                 userId: {
                    _id: job.userId,
                    name: adminInfo ? adminInfo.name : "Unknown Admin",
                    role: adminInfo ? adminInfo.role : "admin"
                }
            };
        });

        res.status(200).json({
            success: true,
            count: populatedJobs.length,
            pagination: {
                totalJobs,
                totalPages: Math.ceil(totalJobs / limitNum),
                currentPage: pageNum,
                pageSize: populatedJobs.length
            },
            data: populatedJobs
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFullTimeJobById = async (req, res) => {
    try {
        const jobByIdOnly = await Job.findById(req.params.id);
        
        if (!jobByIdOnly) {
            return res.status(404).json({ 
                success: false, 
                message: "ID does not exist in database at all" 
            });
        }

        if (jobByIdOnly.jobCategory !== "FULL_TIME_JOB") {
            return res.status(400).json({ 
                success: false, 
                message: `Category mismatch. DB has: ${jobByIdOnly.jobCategory}, but you searched for: FULL_TIME_JOB` 
            });
        }

        const job = await Job.findOne({ _id: req.params.id, jobCategory: "FULL_TIME_JOB" })
            .populate("userId", "name email");

        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminCreateFullTimeJob =  async (req, res) => {
    try {
        const body = req.body;
        
        const userId = body.userId || (req.user ? req.user.id : null);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Valid User ID is required" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser || targetUser.role === "ADMIN") {
            return res.status(400).json({ success: false, message: "Invalid User: Cannot post job for an ADMIN role" });
        }

        const categoryId = body.categoryId; 
        const subCategoryValue = getSingleValue(body.subCategory); 

        const categoryData = await JobsCategory.findOne({ 
            _id: categoryId, 
            type: "FULL_TIME_JOB",
            status: true 
        });

        if (!categoryData || !categoryData.subCategory.includes(subCategoryValue)) {
            return res.status(400).json({ success: false, message: "Invalid Category or Sub-category selection" });
        }

        const imageUrls = await uploadFilesToCloudinary(req.files);

        const lng = getSingleValue(body["location[coordinates][0]"] || body.location?.coordinates?.[0]);
        const lat = getSingleValue(body["location[coordinates][1]"] || body.location?.coordinates?.[1]);
        const address = getSingleValue(body["location[address]"] || body.location?.address);

        if (!lng || !lat) {
            return res.status(400).json({ success: false, message: "Location coordinates are required" });
        }

        let salary = { min: 0, max: 0 };
        const rawSalary = getSingleValue(body.salaryRange);
        if (rawSalary) {
            salary = typeof rawSalary === "string" ? JSON.parse(rawSalary) : rawSalary;
        }

        const jobData = {
            userId,
            title: getSingleValue(body.title),
            details: getSingleValue(body.details),
            companyName: getSingleValue(body.companyName),
            
            category: categoryId,           
            subCategory: subCategoryValue,  
            jobRole: subCategoryValue,      
            
            description: getSingleValue(body.description),
            vacancies: Number(getSingleValue(body.vacancies)) || 0,
            whatsappNumber: getSingleValue(body.whatsappNumber),
            experience: getSingleValue(body.experience),
            qualification: getSingleValue(body.qualification),
            jobCategory: "FULL_TIME_JOB",
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

 const currentAdminId = req.user ? (req.user.userId || req.user.id) : null;
        
        const adminData = await User.findOne({ _id: currentAdminId, role: "ADMIN" }).select("fullName role");

        if (!adminData) {
            return res.status(404).json({ 
                success: false, 
                message: "Only an ADMIN can perform this action",
                debug_id: currentAdminId 
            });
        }

        const finalResponseData = job.toObject();
        finalResponseData.postedForUser = {
            id: targetUser._id,
            name: targetUser.fullName,
            role: targetUser.role
        };

        res.status(201).json({ 
            success: true,
            message: "Job created successfully", 
            postedBy: "ADMIN",
            adminName: adminData.fullName,
            adminRole: adminData.role,
            data: finalResponseData 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateFullTimeJob = async (req, res) => {
    try {
        const body = req.body;
        let updateData = { ...body };

        if (req.files && req.files.length > 0) {
            updateData.images = await uploadFilesToCloudinary(req.files);
        }

        const lng = getSingleValue(body["location[coordinates][0]"] || body.location?.coordinates?.[0]);
        const lat = getSingleValue(body["location[coordinates][1]"] || body.location?.coordinates?.[1]);
        const address = getSingleValue(body["location[address]"] || body.location?.address);

        if (lng && lat) {
            updateData.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)],
                address: address || ""
            };
        }
        const rawSalary = getSingleValue(body.salaryRange);
        if (rawSalary) {
            try {
                updateData.salaryRange = typeof rawSalary === "string" ? JSON.parse(rawSalary) : rawSalary;
            } catch (e) {
                delete updateData.salaryRange;
            }
        }

        if (updateData.vacancies) updateData.vacancies = Number(getSingleValue(updateData.vacancies));

        const keysToDelete = ["location[coordinates][0]", "location[coordinates][1]", "location[address]"];
        keysToDelete.forEach(key => delete updateData[key]);

        const updatedJob = await Job.findOneAndUpdate(
            { _id: req.params.id, jobCategory: "FULL_TIME_JOB" },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedJob) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, message: "Job updated successfully", data: updatedJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteFullTimeJob = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Job ID format" 
            });
        }

        const job = await Job.findOneAndDelete({ 
            _id: id, 
            jobCategory: "FULL_TIME_JOB" 
        });

        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: "Job not found or you don't have permission to delete it" 
            });
        }
        res.status(200).json({ 
            success: true, 
            message: "Full-time job deleted successfully",
            deletedJobId: id 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};

exports.getNonFullTimeJobs = async (req, res) => {
    try {
        const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const adminIds = await Admin.find().distinct("_id");

        let query = { 
            jobCategory: "FULL_TIME_JOB",
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

 const fullTimeJobStats = await Job.aggregate([
            { $match: { jobCategory: "FULL_TIME_JOB", userId: { $nin: adminIds } } },
            {
                $group: {
                    _id: null,
                    totalFullTimeJobs: { $sum: 1 }, 
                    activeCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }, 
                    expiredCount: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } }, 
                    featuredCount: { $sum: { $cond: ["$isFeatured", 1, 0] } }, 
                    totalPostingCredits: { $sum: "$creditsSpent" } 
                }
            }
        ]);

        const fullTimeUnlockStats = await JobUnlock.aggregate([
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
                    "jobInfo.jobCategory": "FULL_TIME_JOB", 
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

        const stats = fullTimeJobStats[0] || { totalFullTimeJobs: 0, activeCount: 0, expiredCount: 0, featuredCount: 0, totalPostingCredits: 0 };
        const unlockStats = fullTimeUnlockStats[0] || { totalUnlocks: 0, totalUnlockCredits: 0 };


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
                totalFullTimeJobs: stats.totalFullTimeJobs,
                activeFullTimeJobs: stats.activeCount,
                expiredFullTimeJobs: stats.expiredCount,
                featuredFullTimeJobs: stats.featuredCount,
                totalUnlocksAcrossAllJobs: unlockStats.totalUnlocks,
                credits: {
                    postingCreditsSpent: stats.totalPostingCredits,
                    unlockCreditsSpent: unlockStats.totalUnlockCredits,
                    totalCreditsSpent: stats.totalPostingCredits + unlockStats.totalUnlockCredits
                }
            },
            count: jobs.length,
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

exports.getAdminSelfJobs = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized access" });
        }

        const { page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = { jobCategory: "FULL_TIME_JOB", userId };
        const totalJobs = await Job.countDocuments(query);
        const jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            success: true,
            count: jobs.length,
            pagination: {
                totalJobs,
                totalPages: Math.ceil(totalJobs / limitNum),
                currentPage: pageNum,
                pageSize: jobs.length
            },
            data: jobs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateJobStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }

        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        const updatedJob = await Job.findOneAndUpdate(
            { _id: id, jobCategory: "FULL_TIME_JOB" },
            { $set: { status } },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        res.status(200).json({ success: true, message: "Status updated successfully", data: updatedJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFullTimeJobStats = async (req, res) => {
    try {
        const adminIds = await Admin.find().distinct("_id");
        
        const totalJobs = await Job.countDocuments({ jobCategory: "FULL_TIME_JOB" });
        const adminJobsCount = await Job.countDocuments({ jobCategory: "FULL_TIME_JOB", userId: { $in: adminIds } });
        const userJobsCount = await Job.countDocuments({ jobCategory: "FULL_TIME_JOB", userId: { $nin: adminIds } });
        const expiredJobsCount = await Job.countDocuments({ jobCategory: "FULL_TIME_JOB", expiresAt: { $lt: new Date() } });

        res.status(200).json({
            success: true,
            data: {
                totalJobs,
                adminJobsCount,
                userJobsCount,
                expiredJobsCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};