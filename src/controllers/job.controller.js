const jobService = require("../services/job.services");

const postJob = async (req, res) => {
  try {
    const creatorId = req.user.userId; 

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token. Please login again."
      });
    }
    const job = await jobService.createJob(req.body, req.files, creatorId);

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: job
    });
  } catch (error) {
    console.error("Error in postJob:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getAllJobs = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getJobById = async (req, res) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error in getJobById:", error);
    res.status(404).json({ success: false, message: error.message });
  }
};


const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.userId;
    const updateData = req.body;
    const files = req.files;

    const updatedJob = await jobService.updateJob(jobId, updateData, files, userId);

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { postJob,getAllJobs , getJobById, updateJob };