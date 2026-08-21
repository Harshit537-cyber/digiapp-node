const Job = require("../models/Job");
const Business = require("../models/Business");
const SavedJob = require("../models/SavedJob");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");
const itemSchema = require('../models/Item')
const fs = require("fs");
const transactionSchema = require("../models/Transitionmodel");
const JobsCategory = require("../../src/admin/models/JobsCategory")


const createJob = async (jobData, files, userId) => {
  try {
    const imageUrls = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "job_tasks",
        });
        imageUrls.push(result.secure_url);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

  let daysToAdd = 15;

    if (jobData.jobCategory === "LOCAL_JOB") {
      daysToAdd = 7;
    } else if (jobData.jobCategory === "PART_TIME_JOB" || jobData.jobCategory === "FULL_TIME_JOB") {
      daysToAdd = 15;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

    const safeParse = (data) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch (e) {
        return undefined;
      }
    };
    const newJob = new Job({
      ...jobData,
      userId,
      images: imageUrls,
      expiresAt,
      // Parsing nested objects
      budget: jobData.budget ? safeParse(jobData.budget) : undefined,
      salaryRange: jobData.salaryRange
        ? safeParse(jobData.salaryRange)
        : undefined,
      preferredCommunication: Array.isArray(jobData.preferredCommunication)
        ? jobData.preferredCommunication
        : jobData.preferredCommunication
          ? [jobData.preferredCommunication]
          : [],
      vacancies: jobData.vacancies ? Number(jobData.vacancies) : undefined,
      isFeatured: jobData.isFeatured === "true" || jobData.isFeatured === true,
    });

    return await newJob.save();
  } catch (error) {
    throw new Error(error.message);
  }
};

const deductCredits = async (userId, amount, reason, referenceId) => {
  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  if (user.credits < amount) {
    throw new Error("Insufficient credits");
  }

  console.log("user.credits :", user.credits);
  user.credits -= amount;
  await user.save();

  await transactionSchema.create({
    userId,
    type: "DEBIT",
    amount,
    reason,
    balanceAfter: user.credits,
    referenceId,
  });

  return user;
};

const deactivateJob = async (jobId, userId) => {
  const job = await Job.findById(jobId);

  if (!job) throw new Error("Job not found");

  if (job.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized: You can only delete your own posts");
  }

  await Job.findByIdAndDelete(jobId); 

  return { message: "Job deleted permanently from database" };
};

const getAllJobs = async (page, limit, category) => {
  try {
    const skip = (page - 1) * limit;

    let query = {
      status: "active",
      expiresAt: { $gte: new Date() },
    };

    if (category) {
      query.jobCategory = category;
    }

    const totalJobs = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .populate("userId", "fullName profilePhoto location")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalJobs / limit);

    return { jobs, totalJobs, totalPages };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getJobById = async (jobId) => {
  const job = await Job.findById(jobId).populate(
    "userId",
    "fullName profilePhoto mobile",
  );
  if (!job) throw new Error("Job not found");
  return job;
};

const updateJob = async (jobId, updateData, files, userId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.userId.toString() !== userId.toString())
    throw new Error("Unauthorized access");

  let updatedImages = job.images;
  if (files && files.length > 0) {
  }

  // Parse fields if they exist in updateData
  if (updateData.budget)
    updateData.budget =
      typeof updateData.budget === "string"
        ? JSON.parse(updateData.budget)
        : updateData.budget;
  if (updateData.salaryRange)
    updateData.salaryRange =
      typeof updateData.salaryRange === "string"
        ? JSON.parse(updateData.salaryRange)
        : updateData.salaryRange;

  return await Job.findByIdAndUpdate(
    jobId,
    { ...updateData, images: updatedImages },
    { new: true },
  );
};

const activateJob = async (jobId, userId) => {
  try {
    // Basic validation
    if (!jobId) {
      throw new Error("Job ID is required");
    }

    if (!userId) {
      throw new Error("Auth error: User ID not found in request");
    }

    // Fetch job
    const job = await Job.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    console.log("Job from DB:", job);
    console.log("UserID from Token:", userId);

    // Check job owner
    if (!job.userId) {
      throw new Error("Database error: This job post doesn't have an owner ID");
    }

    // Authorization check
    if (job.userId.toString() !== userId.toString()) {
      throw new Error("Unauthorized: You can only activate your own job posts");
    }

    // Prevent re-activation
    if (job.status === "active") {
      throw new Error("Job is already active");
    }

    // Expiry logic
    const daysToAdd = job.jobCategory === "Local task" ? 7 : 15;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + daysToAdd);

    job.status = "active";
    job.expiresAt = newExpiry;

    // Save job
    const updatedJob = await job.save();
    return updatedJob;
  } catch (error) {
    console.error("Activate Job Error:", error.message);

    throw new Error(
      error.message || "Something went wrong while activating job",
    );
  }
};

const searchJobsByTitle = async (searchQuery) => {
  try {
    const jobs = await Job.find({
      title: { $regex: searchQuery, $options: "i" },
      status: "active",
      expiresAt: { $gte: new Date() },
    }).populate("userId", "fullName profilePhoto location");

    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getMyJobs = async (userId) => {
  try {
    const jobs = await Job.find({ userId })
      .populate("userId", "fullName location profilePhoto")
      .sort({ createdAt: -1 });

    const total = await Job.countDocuments({ userId });

    return { jobs, total };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getNearbyLatestJobs = async (latitude, longitude) => {
  try {
    const userCoordinates = [Number(longitude), Number(latitude)];
    const now = new Date();
    /* ================= JOBS ================= */

    const totalJobsCount = await Job.countDocuments({jobCategory: "LOCAL_JOB", 
      status: "active",
      expiresAt: { $gte: now } });

    let jobs = await Job.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: userCoordinates },
          distanceField: "distance",
          maxDistance: 10000,
          spherical: true,
        },
      },
      {
        $match: {
          status: "active",
          jobCategory: "LOCAL_JOB",
          expiresAt: { $gte: new Date() },
        },
      },
      {
        $addFields: {
          distanceInKm: {
            $round: [{ $divide: ["$distance", 1000] }, 2],
          },
        },
      },
      {
        $sort: {isFeatured: -1,  createdAt: -1, distance: 1 },
      },
      { $limit: 40 },
    ]);

    /* Fill remaining jobs */
    if (jobs.length < 30) {
      const remaining = 30 - jobs.length;

      const extraJobs = await Job.find({
        status: "active",
          jobCategory: "LOCAL_JOB",
          expiresAt: { $gte: now },
        _id: { $nin: jobs.map((j) => j._id) },
      })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(remaining);

      jobs.push(...extraJobs);
    }

    /* ================= SHOPS ================= */

    // COMMON STAGES (reuse in both pipelines)
    const priorityStages = [
      {
        $addFields: {
          badgePriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$badge", "Trusted"] }, then: 3 },
                { case: { $eq: ["$badge", "Normal"] }, then: 2 },
                { case: { $eq: ["$badge", "Trial"] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      {
        $addFields: {
          distanceInKm: {
            $round: [{ $divide: ["$distance", 1000] }, 2],
          },
        },
      },
    ];

    // ================= 1️⃣ NEARBY =================
    let shops = await Business.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: userCoordinates },
          distanceField: "distance",
          maxDistance: 10000,
          spherical: true,
        },
      },

      // { $match: { status: "active" } },
      {
        $match: {
          status: { $in: ["active", "Approved"] },
        },
      },

      ...priorityStages,

      {
        $sort: {
          badgePriority: -1,
          distance: 1,
          createdAt: -1,
        },
      },

      { $limit: 25 },
    ]);

    // ================= 2️⃣ FILL REMAINING =================
    if (shops.length < 25) {
      const remaining = 25 - shops.length;

      const extraShops = await Business.aggregate([
        {
          $match: {
            status: "active",
            _id: { $nin: shops.map((s) => s._id) },
          },
        },

        // fake distance so sort still works
        {
          $addFields: {
            distance: 999999999,
          },
        },

        ...priorityStages,

        {
          $sort: {
            badgePriority: -1,
            createdAt: -1,
          },
        },

        { $limit: remaining },
      ]);

      shops = [...shops, ...extraShops];

      // ✅ FINAL SORT (VERY IMPORTANT)
      shops.sort((a, b) => {
        if (b.badgePriority !== a.badgePriority) {
          return b.badgePriority - a.badgePriority; // Trusted first
        }
        return a.distance - b.distance; // nearest first
      });
    }

    /* ================= BLOOD REQUEST ================= */

    const bloodRequests = await BloodRequest.aggregate([
      {
        $addFields: {
          urgencyPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$urgency", "Critical"] }, then: 3 },
                { case: { $eq: ["$urgency", "High"] }, then: 2 },
                { case: { $eq: ["$urgency", "Medium"] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      {
        $sort: {
          urgencyPriority: -1,
          createdAt: -1,
        },
      },
      { $limit: 25 },
    ]);

    return { totalJobsCount, jobs, shops, bloodRequests };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getGuestHomeData = async () => {
  try {
    const [
      jobs,
      shops,
      bloodRequests,
      totalJobs,
      totalBloodRequest,
      totalShop,
      totalItem,
    ] = await Promise.all([
      Job.find({ status: "active" }).sort({ createdAt: -1 }).limit(30),

      Business.find({
        status: { $in: ["active", "Approved"] },
        isBlocked: false,
      })
        .sort({ createdAt: -1 })
        .limit(20),

      BloodRequest.find({ status: "Active" }).sort({ createdAt: -1 }).limit(25),

      Job.countDocuments({ status: "active" }),
      BloodRequest.countDocuments({ status: "Active" }),
      Business.countDocuments({ status: "active" }),
      itemSchema.countDocuments({
        expiryDate: { $gt: new Date() }, // only future dates
      }),
    ]);

    return { jobs, shops, bloodRequests, totalJobs, totalBloodRequest, totalShop, totalItem };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getMyActiveJobs = async (userId) => {
  try {
    const jobs = await Job.find({
      userId,
      status: "active",
      expiresAt: { $gte: new Date() },
    })
      .populate("userId", "fullName location profilePhoto")
      .sort({ createdAt: -1 });

    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getMyDeactivatedJobs = async (userId) => {
  try {
    const jobs = await Job.find({
      userId,
      status: "closed",
    })
      .populate("userId", "fullName location profilePhoto")
      .sort({ createdAt: -1 });

    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
};

const toggleSaveJob = async (userId, jobId) => {
  const existingSave = await SavedJob.findOne({ userId, jobId });

  if (existingSave) {
    await SavedJob.deleteOne({ _id: existingSave._id });
    return { status: "removed", message: "Job removed from saved list" };
  } else {
    const newSave = new SavedJob({ userId, jobId });
    await newSave.save();
    return { status: "saved", message: "Job saved successfully" };
  }
};

const getMySavedJobs = async (userId) => {
  const savedJobs = await SavedJob.find({ userId })
    .populate({
      path: "jobId",
      populate: { path: "userId", select: "fullName profilePhoto" },
    })
    .sort({ savedAt: -1 });

  return savedJobs.map((item) => item.jobId);
};

const getRecentJobs = async (limit = 10) => {
  try {
    const jobs = await Job.find({
      status: "active",
      expiresAt: { $gte: new Date() },
    })
      .populate("userId", "fullName profilePhoto location")
      .sort({ createdAt: -1 }) // 🔥 MOST IMPORTANT LINE
      .limit(limit);

    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
  
};

const getJobsList = async (isLoggedIn, requestedCategory) => {
  try {
    let filter = { status: "active" };

    if (!isLoggedIn) {
      // Logic: User login nahi hai, toh sirf LOCAL_JOB filter lagao
      filter.jobCategory = "LOCAL_JOB";
    } else {
      // Logic: User login hai, toh in teen categories se match hote results dikhao
      filter.jobCategory = {
        $in: ["LOCAL_JOB", "PART_TIME_JOB", "FULL_TIME_JOB"],
      };
    }

    // Database se data fetch karein
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deactivateJob,
  activateJob,
  searchJobsByTitle,
  getMyJobs,
  getNearbyLatestJobs,
  getMyActiveJobs,
  getMyDeactivatedJobs,
  toggleSaveJob,
  getMySavedJobs,
  getRecentJobs,
  getGuestHomeData,
  deductCredits,
  getJobsList,
};
