const jobService = require("../services/job.services");
const Job = require("../models/Job")
const Business = require('../models/Business')
const transactionSchema = require('../models/Transitionmodel')
const mongoose = require('mongoose');
const User = require('../models/User')
const JobsCategory = require("../admin/models/JobsCategory")


const postJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const creatorId = req.user.userId;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Please login again."
      });
    }

    const { jobCategory, isFeatured,category, subCategory  } = req.body;

    if (!category || !subCategory) {
      throw new Error("Category and Sub-category are required");
    }

    const catData = await JobsCategory.findById(category).session(session);
    
    if (!catData) {
      throw new Error("Selected Category not found");
    }

    if (catData.type !== jobCategory) {
      throw new Error(`This category is only for ${catData.type}`);
    }

    if (!catData.subCategory.includes(subCategory)) {
      throw new Error("Invalid sub-category selection for this category");
    }

    const jobConfig = {
      LOCAL_JOB: { credits: 10, label: "LOCAL_JOB" },
      PART_TIME_JOB: { credits: 25, label: "PART_TIME_JOB" },
      FULL_TIME_JOB: { credits: 25, label: "FULL_TIME_JOB" }
    };

    const config = jobConfig[jobCategory];

    if (!config) {
      throw new Error("Invalid job type");
    }

    req.body.jobCategory = config.label;

    const FEATURED_CREDITS = 10;
    const totalCredits = isFeatured ? config.credits + FEATURED_CREDITS : config.credits;

    const user = await User.findById(creatorId).session(session);

    if (!user) throw new Error("User not found");

    if (user.credits < totalCredits) {
      throw new Error("Insufficient credits");
    }

    const job = await jobService.createJob(
      req.body,
      req.files,
      creatorId,
      session
    );

    user.credits -= totalCredits;
    await user.save({ session });

    await transactionSchema.create([{
      userId: creatorId,
      type: "DEBIT",
      amount: totalCredits,
      reason: isFeatured ? "POST_FEATURED_JOB" : "POST_JOB",
      referenceId: job._id,
      balanceAfter: user.credits
    }], { session });

    // ✅ Commit
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `${config.label} posted successfully`,
      data: job
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("POST JOB ERROR 👉", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const deactivateJob = async (req, res) => {
  try {
    const updatedJob = await jobService.deactivateJob(req.params.id, req.user.userId);
    res.status(200).json({ success: true, message: "Post deactivated", data: updatedJob });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getAllJobs = async (req, res) => {
  try {
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8; 
    const category = req.query.category; 

    // Service ko category pass ki
    const { jobs, totalJobs, totalPages } = await jobService.getAllJobs(page, limit, category);

    res.status(200).json({
      success: true,
      count: jobs.length, 
      totalJobs,         
      totalPages,        
      currentPage: page,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const updatedJob = await jobService.updateJob(req.params.id, req.body, req.files, req.user.userId);
    res.status(200).json({ success: true, message: "Updated successfully", data: updatedJob });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const activateJob = async (req, res) => {
  try {
    console.log("User Object from Middleware:", req.user); 
    
    const userId = req.user.userId || req.user.id || req.user._id; 
    
    const updatedJob = await jobService.activateJob(req.params.id, userId);
    res.status(200).json({ success: true, message: "Post activated successfully", data: updatedJob });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const searchJobs = async (req, res) => {
  try {
    const query = req.query.q; 
    
    if (!query) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const jobs = await jobService.searchJobsByTitle(query);

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyJobs = async (req, res) => {
  try {
    const userId = req.user.userId; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    const { jobs, total } = await jobService.getMyJobs(userId);

    res.status(200).json({
      success: true,
      totalJobsPosted: total, 
      countInThisResponse: jobs.length,
      data: jobs 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




const getTheNearbyLatestJob = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    console.log(' lat',latitude, " long ",  longitude)
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required",
      });
    }

    const { jobs, shops, bloodRequests , totalJobsCount} =
      await jobService.getNearbyLatestJobs(latitude, longitude);

    res.status(200).json({
      
      success: true,
       totalJobs: totalJobsCount,
      jobCount: jobs.length,
      shopCount: shops.length,
      bloodRequestCount: bloodRequests.length,
      jobs,
      shops,
      bloodRequests,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




const homeAPI = async (req, res) => {
  try {
    const { jobs, shops, bloodRequests , totalJobs, totalBloodRequest, totalShop, totalItem} =
      await jobService.getGuestHomeData();

    res.status(200).json({
      success: true,
       totalJobs: totalJobs || 0,
       totalBloodRequest,
         totalShop,
      totalItem,
      type: "guest",
      jobs,
      shops,
      bloodRequests
    
      
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getMyActiveJobs = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const jobs = await jobService.getMyActiveJobs(userId);

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyDeactivatedJobs = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const jobs = await jobService.getMyDeactivatedJobs(userId);

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const toggleSaveJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const jobId = req.params.id;

    const result = await jobService.toggleSaveJob(userId, jobId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const jobs = await jobService.getMySavedJobs(userId);
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getRecentJobs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const jobs = await jobService.getRecentJobs(limit);

    res.status(200).json({
      success: true,
      message: "Recently added jobs",
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const handleGetJobs = async (req, res) => {
  try {
    const { jobCategory } = req.query; 
    const isLoggedIn = !!req.user; 

    let filter = {};

    if (!isLoggedIn) {

      filter.jobCategory = "LOCAL_JOB";
    } else {
      
      if (jobCategory ) {
      
        filter.jobCategory = jobCategory;
      } else  {
        return res.status(200).json({
          success: true,
          isLoggedIn: isLoggedIn,
          count: 0,
          data: [], 
        });
      }
      
    }

    // Database se jobs find karein
    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      isLoggedIn: isLoggedIn,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const getMyPostedJobs = async (req, res) => {
  try {
    const idFromToken = req.user.userId; 

    if (!idFromToken) {
      return res.status(400).json({ success: false, message: "User ID not found in token" });
    }
    const query = { userId: new mongoose.Types.ObjectId(idFromToken) };
    if (req.query.category) {
      query.jobCategory = req.query.category;
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const searchMyJobsAdvanced = async (req, res) => {
  try {
    const idFromToken = req.user.userId;
    const { category, search } = req.query; 

    if (!idFromToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let filter = { userId: new mongoose.Types.ObjectId(idFromToken) };

    if (category) {
      filter.jobCategory = category; 
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { jobRole: { $regex: search, $options: "i" } }
      ];
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Search Error",
      error: error.message,
    });
  }
};


module.exports = { postJob, getAllJobs, getJobById, updateJob ,deactivateJob , activateJob , searchJobs ,getMyJobs , getTheNearbyLatestJob, getMyActiveJobs, 
  getMyDeactivatedJobs , toggleSaveJob,handleGetJobs,
    getSavedJobs, getRecentJobs, homeAPI,getMyPostedJobs, searchMyJobsAdvanced};