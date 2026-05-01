const Job = require("../../models/Job");
const cloudinary = require("../../config/cloudinary"); // Path sahi check kar lein
const fs = require("fs");
const Admin = require("../models/Admin");

const uploadFilesToCloudinary = async (files) => {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) =>
    cloudinary.uploader.upload(file.path, { folder: "jobs" }),
  );
  const results = await Promise.all(uploadPromises);

  files.forEach((file) => fs.unlinkSync(file.path));

  return results.map((result) => result.secure_url);
};

exports.getLocalJobsForAdmin = async (req, res) => {
  try {
    const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const admins = await Admin.find().select("_id name role");
    const adminIds = admins.map((admin) => admin._id);

    const adminMap = {};
    admins.forEach((admin) => {
      adminMap[admin._id.toString()] = { name: admin.name, role: admin.role };
    });

    let query = {
      jobCategory: "LOCAL_JOB",
      userId: { $in: adminIds },
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
          $centerSphere: [[longitude, latitude], radiusInRadians],
        },
      };
    }

    const totalJobs = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); 

    
    const populatedJobs = jobs.map((job) => {
      const adminInfo = adminMap[job.userId?.toString()];
      return {
        ...job,
        userId: adminInfo || { name: "Unknown Admin", role: "ADMIN" },
      };
    });

    res.status(200).json({
      success: true,
      count: populatedJobs.length,
      pagination: {
        totalJobs,
        totalPages: Math.ceil(totalJobs / limitNum),
        currentPage: pageNum,
        pageSize: populatedJobs.length,
      },
      data: populatedJobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.adminCreateLocalJob = async (req, res) => {
  try {
    const body = req.body;
    const userId = req.user.id;

    const imageUrls = await uploadFilesToCloudinary(req.files);

    const lng =
      body.location?.coordinates?.[0] || body["location[coordinates][0]"] || 0;
    const lat =
      body.location?.coordinates?.[1] || body["location[coordinates][1]"] || 0;
    const address = body.location?.address || body["location[address]"] || "";

    let budget = { min: 0, max: 0 };
    if (body.budget) {
      budget =
        typeof body.budget === "string" ? JSON.parse(body.budget) : body.budget;
    }

    let preferredComm = [];
    if (body.preferredCommunication) {
      preferredComm =
        typeof body.preferredCommunication === "string"
          ? JSON.parse(body.preferredCommunication)
          : body.preferredCommunication;
    }

    const jobData = {
      ...body,
      userId,
      jobCategory: "LOCAL_JOB",
      images: imageUrls,
      budget: budget,
      preferredCommunication: preferredComm,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address,
      },
   
      isFeatured: body.isFeatured === "true" || body.isFeatured === true,
      expiresAt:
        body.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const job = await Job.create(jobData);

    const adminData = await Admin.findById(userId).select("fullName role");

    if (!adminData) {
      return res
        .status(404)
        .json({ success: false, message: "Admin details not found" });
    }

    const finalResponseData = job.toObject();
    finalResponseData.userId = adminData;

    res.status(201).json({
      success: true,
      message: "Local Job created successfully by Admin",
      postedBy: "ADMIN",
      adminName: adminData.fullName,
      adminRole: adminData.role,
      data: finalResponseData,
    });
  } catch (error) {
    console.error("Create Local Job Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.adminUpdateLocalJob = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    let job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    let imageUrls = job.images;
    if (req.files && req.files.length > 0) {
      const newImages = await uploadFilesToCloudinary(req.files);
      imageUrls = [...newImages];
    }

    const lng =
      body.location?.coordinates?.[0] ||
      body["location[coordinates][0]"] ||
      job.location.coordinates[0];
    const lat =
      body.location?.coordinates?.[1] ||
      body["location[coordinates][1]"] ||
      job.location.coordinates[1];
    const address =
      body.location?.address ||
      body["location[address]"] ||
      job.location.address;

    let budget = job.budget;
    if (body.budget) {
      budget =
        typeof body.budget === "string" ? JSON.parse(body.budget) : body.budget;
    }

    const updateData = {
      ...body,
      images: imageUrls,
      budget: budget,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address,
      },
      isFeatured:
        body.isFeatured !== undefined
          ? body.isFeatured === "true" || body.isFeatured === true
          : job.isFeatured,
    };

    const updatedJob = await Job.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Local Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminDeleteLocalJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    await Job.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Local Job deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRegularUserLocalJobs = async (req, res) => {
  try {
    const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const adminIds = await Admin.find().distinct("_id");

    let query = {
      jobCategory: "LOCAL_JOB",
      userId: { $nin: adminIds },
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
          $centerSphere: [[longitude, latitude], radiusInRadians],
        },
      };
    }

    const totalJobs = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .populate("userId", "fullName role profilePhoto mobile")
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
        pageSize: jobs.length,
      },
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
