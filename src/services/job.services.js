const Job = require("../models/Job");
const cloudinary = require("../config/cloudinary");
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

const getAllJobs = async () => {
  return await Job.find({ status: "active", expiresAt: { $gte: new Date() } })
    .populate("userId", "fullName profilePhoto location")
    .sort({ createdAt: -1 });
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

module.exports = { createJob, getAllJobs, getJobById, updateJob };