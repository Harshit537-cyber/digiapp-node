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

const getAllJobs = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
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

module.exports = { postJob, getAllJobs, getJobById, updateJob };