const Job = require("../../models/Job");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");

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
        const jobs = await Job.find({ jobCategory: "Full-time job" })
            .populate("userId", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFullTimeJobById = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, jobCategory: "Full-time job" })
            .populate("userId", "name email");
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminCreateFullTimeJob = async (req, res) => {
    try {
        const body = req.body;
        const userId = body.userId || (req.user ? req.user.id : null);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Valid User ID is required" });
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
            jobRole: getSingleValue(body.jobRole),
            description: getSingleValue(body.description),
            vacancies: Number(getSingleValue(body.vacancies)) || 0,
            whatsappNumber: getSingleValue(body.whatsappNumber),
            experience: getSingleValue(body.experience),
            qualification: getSingleValue(body.qualification),
            jobCategory: "Full-time job",
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
        res.status(201).json({ success: true, message: "Job created successfully", data: job });
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
        if (rawSalary && typeof rawSalary === "string") {
            try { updateData.salaryRange = JSON.parse(rawSalary); } catch (e) {}
        }

        if (updateData.vacancies) updateData.vacancies = Number(getSingleValue(updateData.vacancies));

        const keysToDelete = ["location[coordinates][0]", "location[coordinates][1]", "location[address]"];
        keysToDelete.forEach(key => delete updateData[key]);

        const updatedJob = await Job.findOneAndUpdate(
            { _id: req.params.id, jobCategory: "Full-time job" },
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
        const job = await Job.findOneAndDelete({ _id: req.params.id, jobCategory: "Full-time job" });
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, message: "Job deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};