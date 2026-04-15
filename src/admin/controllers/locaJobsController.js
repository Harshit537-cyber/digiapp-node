const Job = require("../../models/Job");



exports.getLocalJobs = async (req, res) => {
    try {
 const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [localJobs, totalLocalJobs,
            activeLocalJobs,
            featuredLocalJobs] = await Promise.all([

                Job.find({ jobCategory: "LOCAL_JOB" }).sort({ createdAt: -1 })
                 .skip(skip)
                    .limit(limit),

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
             totalPages: Math.ceil(totalLocalJobs / limit),
            currentPage: page,
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


exports.createLocalJob = async (req, res) => {
    try {
        const { adminId } = req.params;


        const { title, details, budget, status, isFeatured, jobCategory } = req.body;

        const newJob = new Job({
            userId: adminId,
            jobCategory: jobCategory,
            title,
            details,
            budget,
            status,
            isFeatured,


            location: {
                type: "Point",
                coordinates: [0, 0],
                address: "Default Local Address",
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        const savedJob = await newJob.save();

        res.status(201).json({
            success: true,
            message: "Local Job created successfully",
            data: savedJob,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Failed to create local job",
            error: error.message,
        });
    }
};



exports.updateLocalJob = async (req, res) => {
  try {
    const { jobId, adminId } = req.params;
    let job = await Job.findOne({ _id: jobId, userId: adminId, jobCategory: "LOCAL_JOB" });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Local job not found or you are not authorized to update it",
      });
    }

    const fieldsToUpdate = {
      title: req.body.title,
      details: req.body.details,
      budget: req.body.budget,
      status: req.body.status,
      isFeatured: req.body.isFeatured,
      location: req.body.location || job.location,
    };

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Local job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update local job",
      error: error.message,
    });
  }
};