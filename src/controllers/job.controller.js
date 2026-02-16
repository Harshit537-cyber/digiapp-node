const jobService = require("../services/job.services");

const postJob = async (req, res) => {
  try {
    const creatorId = req.user.userId; 
    if (!creatorId) return res.status(401).json({ success: false, message: "Please login again." });

    const job = await jobService.createJob(req.body, req.files, creatorId);

    res.status(201).json({
      success: true,
      message: `${req.body.jobCategory} posted successfully`,
      data: job
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

module.exports = { postJob, getAllJobs, getJobById, updateJob ,deactivateJob , activateJob , searchJobs ,getMyJobs, getMyActiveJobs, 
  getMyDeactivatedJobs , toggleSaveJob,
    getSavedJobs, getRecentJobs };