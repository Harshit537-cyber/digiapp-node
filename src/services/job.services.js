const Job = require("../models/Job");
const SavedJob = require("../models/SavedJob"); 
const cloudinary = require("../config/cloudinary");
const User = require('../models/User')
const fs = require("fs");

const createJob = async (jobData, files, userId) => {
  try {
    const imageUrls = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: "job_tasks" });
        imageUrls.push(result.secure_url);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

    // Expiry Logic: Task = 7 days, Job = 15 days
    let daysToAdd = jobData.jobCategory === "Local task" ? 7 : 15;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

    // Helper to parse JSON safely (Frontend sends strings in FormData)
    const safeParse = (data) => {
      try { return typeof data === 'string' ? JSON.parse(data) : data; } 
      catch (e) { return undefined; }
    };

    const newJob = new Job({
      ...jobData,
      userId,
      images: imageUrls,
      expiresAt,
      // Parsing nested objects
      budget: jobData.budget ? safeParse(jobData.budget) : undefined,
      salaryRange: jobData.salaryRange ? safeParse(jobData.salaryRange) : undefined,
      preferredCommunication: Array.isArray(jobData.preferredCommunication) 
        ? jobData.preferredCommunication 
        : (jobData.preferredCommunication ? [jobData.preferredCommunication] : []),
      vacancies: jobData.vacancies ? Number(jobData.vacancies) : undefined,
      isFeatured: jobData.isFeatured === 'true' || jobData.isFeatured === true
    });

    return await newJob.save();
  } catch (error) {
    throw new Error(error.message);
  }
};


const deactivateJob = async (jobId, userId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found");
  
  if (job.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized: You can only deactivate your own posts");
  }

  job.status = "closed";
  return await job.save();
};



const getAllJobs = async (page, limit, category) => { 
  try {
    const skip = (page - 1) * limit;


    let query = { 
      status: "active", 
      expiresAt: { $gte: new Date() } 
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
  const job = await Job.findById(jobId).populate("userId", "fullName profilePhoto mobile");
  if (!job) throw new Error("Job not found");
  return job;
};

const updateJob = async (jobId, updateData, files, userId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.userId.toString() !== userId.toString()) throw new Error("Unauthorized access");

  let updatedImages = job.images;
  if (files && files.length > 0) {
   
  }

  // Parse fields if they exist in updateData
  if(updateData.budget) updateData.budget = typeof updateData.budget === 'string' ? JSON.parse(updateData.budget) : updateData.budget;
  if(updateData.salaryRange) updateData.salaryRange = typeof updateData.salaryRange === 'string' ? JSON.parse(updateData.salaryRange) : updateData.salaryRange;

  return await Job.findByIdAndUpdate(jobId, { ...updateData, images: updatedImages }, { new: true });
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
      throw new Error(
        "Database error: This job post doesn't have an owner ID"
      );
    }

    // Authorization check
    if (job.userId.toString() !== userId.toString()) {
      throw new Error(
        "Unauthorized: You can only activate your own job posts"
      );
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

   
    throw new Error(error.message || "Something went wrong while activating job");
  }
};


const searchJobsByTitle = async (searchQuery) => {
  try {
    
    const jobs = await Job.find({
      title: { $regex: searchQuery, $options: "i" }, 
      status: "active", 
      expiresAt: { $gte: new Date() } 
    }).populate("userId", "fullName profilePhoto location");

    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
};


const getMyJobs = async (userId) => {
  try {
    const jobs = await Job.find({ userId })
      .populate('userId', 'fullName location profilePhoto') 
      .sort({ createdAt: -1 });

    const total = await Job.countDocuments({ userId });

    return { jobs, total };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getNearbyLatestJobs = async (userId) => {
 
  try {
    const user = await User.findById(userId);
   
    if (!user || !user.location) {
      throw new Error("User location not found");
    }

    const jobs = await Job.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: user.location.coordinates, // [lng, lat]
          },
          distanceField: "distance",
          maxDistance: 5000, // 🔥 5 KM (meters)
          spherical: true,
        },
      },
      {
        $match: {
          status: "active",
          expiresAt: { $gte: new Date() },
          userId: { $ne: user._id } // optional: exclude user's own jobs
        },
      },
      {
        $sort: { createdAt: -1 }, // latest first
      },
      {
        $limit: 30, // 🔥 get 30 jobs
      },
    ]);

    return jobs;

  } catch (error) {
    throw new Error(error.message);
  }
};


const getMyActiveJobs = async (userId) => {
  try {
    const jobs = await Job.find({ 
      userId, 
      status: "active", 
      expiresAt: { $gte: new Date() }
    })
    .populate('userId', 'fullName location profilePhoto')
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
      status: "closed" 
    })
    .populate('userId', 'fullName location profilePhoto')
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
      populate: { path: "userId", select: "fullName profilePhoto" } 
    })
    .sort({ savedAt: -1 });

  return savedJobs.map(item => item.jobId); 
};

const getRecentJobs = async (limit = 10) => {
  try {
    const jobs = await Job.find({
      status: "active",
      expiresAt: { $gte: new Date() }
    })
      .populate("userId", "fullName profilePhoto location")
      .sort({ createdAt: -1 })   // 🔥 MOST IMPORTANT LINE
      .limit(limit);

    return jobs;
  } catch (error) {
    throw new Error(error.message);
  }
};



module.exports = { createJob, getAllJobs, getJobById, updateJob, deactivateJob, activateJob ,searchJobsByTitle , getMyJobs, getNearbyLatestJobs, getMyActiveJobs, 
  getMyDeactivatedJobs ,toggleSaveJob, 
    getMySavedJobs , getRecentJobs};