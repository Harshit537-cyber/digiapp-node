const Job = require("../../models/Job");

//  GET ALL FULL-TIME JOBS
exports.getAllFullTimeJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ jobCategory: "Full-time job" })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while fetching jobs", 
            error: error.message 
        });
    }
};

// 2. UPDATE FULL-TIME JOB
exports.updateFullTimeJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const updateData = req.body;

        // Ensure update is only applied to a Full-time job
        const updatedJob = await Job.findOneAndUpdate(
            { _id: jobId, jobCategory: "Full-time job" },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({ 
                success: false, 
                message: "Full-time job not found" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Job updated successfully",
            data: updatedJob
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Update failed", 
            error: error.message 
        });
    }
};

// 3. DELETE FULL-TIME JOB
exports.deleteFullTimeJob = async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({ 
            _id: req.params.id, 
            jobCategory: "Full-time job" 
        });

        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: "Job not found or already deleted" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Full-time job deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Delete failed", 
            error: error.message 
        });
    }
};


exports.getFullTimeJobById = async (req, res) => {
    try {
        const job = await Job.findOne({ 
            _id: req.params.id, 
            jobCategory: "Full-time job" 
        }).populate('userId', 'name email');

        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: "Full-time job not found" 
            });
        }

        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Error fetching job details", 
            error: error.message 
        });
    }
};