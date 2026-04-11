const Job = require("../../models/Job");
exports.getLocalJobs = async (req, res) => {
  try {
    const localJobs = await Job.find({ jobCategory: "LOCAL_JOB" }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: localJobs.length,
      data: localJobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error while fetching local jobs",
      error: error.message,
    });
  }
};