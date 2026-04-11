const Job = require("../../models/Job");



exports.getLocalJobs = async (req, res) => {
  try {
    const [localJobs,totalLocalJobs, 
      activeLocalJobs, 
      featuredLocalJobs] = await Promise.all([

Job.find({ jobCategory: "LOCAL_JOB" }).sort({ createdAt: -1 }),

      Job.countDocuments({ jobCategory: "LOCAL_JOB" }),

      Job.countDocuments({ jobCategory: "LOCAL_JOB", status: "active" }),

      Job.countDocuments({ jobCategory: "LOCAL_JOB", isFeatured: true }),

      ]);
    res.status(200).json({
      success: true,
      count: localJobs.length,
        totalCount: totalLocalJobs,
      activeCount: activeLocalJobs,
      featuredCount: featuredLocalJobs,
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