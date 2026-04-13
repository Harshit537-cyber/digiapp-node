const Job = require("../../models/Job");
const jobService = require("../../services/job.services");
const cloudinary = require("../../config/cloudinary"); // Path sahi check kar lein
const fs = require("fs");

// Helper: Cloudinary par images upload karne ke liye
const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map(file =>
        cloudinary.uploader.upload(file.path, { folder: "jobs" })
    );
    const results = await Promise.all(uploadPromises);


    files.forEach(file => fs.unlinkSync(file.path));

    return results.map(result => result.secure_url);
};

exports.getAllJobsForAdmin = async (req, res) => {
    try {
        const jobs = await Job.find({ jobCategory: "PART_TIME_JOB" })
            .populate("userId", "name role")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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
        const userId = body.userId || req.user.id;

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
        res.status(201).json({ success: true, message: "Job created with images", data: job });
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


        let query = { jobCategory: "PART_TIME_JOB" };
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
            .populate("userId", "name role")
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