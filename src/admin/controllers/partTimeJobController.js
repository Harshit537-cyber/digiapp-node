const Job = require("../../models/Job");
const jobService = require("../../services/job.services"); 

// --- GET ALL JOBS (For Admin Table) ---
exports.getAllJobsForAdmin = async (req, res) => {
    try {
       
        const jobs = await Job.find({ jobCategory: "Part-time job" })
            .populate('userId', 'name role') 
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- ADMIN UPDATE JOB ---
exports.adminUpdateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const updateData = req.body;

        // Check ki job exist karti hai aur woh Part-time hi hai
        const updatedJob = await Job.findOneAndUpdate(
            { _id: jobId, jobCategory: "Part-time job" }, // Filter: ID + Category
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({ 
                message: "Job not found or it is not a Part-time job" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Part-time job updated successfully",
            data: updatedJob
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- ADMIN DELETE JOB ---
exports.adminDeleteJob = async (req, res) => {
    try {
     
        const job = await Job.findOneAndDelete({ 
            _id: req.params.id, 
            jobCategory: "Part-time job" 
        });

        if (!job) {
            return res.status(404).json({ 
                message: "Job not found or it is not a Part-time job" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Part-time job deleted successfully by Admin"
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.getJobByIdForAdmin = async (req, res) => {
    try {
        const jobId = req.params.id;

      
        const job = await Job.findOne({ 
            _id: jobId, 
            jobCategory: "Part-time job" 
        }).populate('userId', 'name role email'); 

        if (!job) {
            return res.status(404).json({ 
                success: false,
                message: "Job not found or it is not a Part-time job" 
            });
        }

        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.adminCreateJob = async (req, res) => {
    try {
        
        const jobData = {
            ...req.body,
            jobCategory: "Part-time job"
        };

         const userId = req.body.userId || req.user.id; 
        const files = req.files;   

        
        const job = await jobService.createJob(jobData, files, userId);

        res.status(201).json({
            success: true,
            message: "Part-time job created successfully by Admin with images",
            data: job
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};