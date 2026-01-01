const Job = require("../models/Job");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

const createJob = async (jobData, files, userId) => {
  try {
    const imageUrls = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "job_tasks",
        });
        imageUrls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    }


    const newJob = new Job({
      ...jobData,
      userId,
      images: imageUrls,
      budget: JSON.parse(jobData.budget),
      preferredCommunication: Array.isArray(jobData.preferredCommunication)
        ? jobData.preferredCommunication
        : [jobData.preferredCommunication]
    });

    return await newJob.save();
  } catch (error) {
    throw new Error(error.message);
  }
};


const getAllJobs = async () => {

  return await Job.find({ status: "active" })
    .populate("userId", "fullName profilePhoto location")
    .sort({ createdAt: -1 });
};


const getJobById = async (jobId) => {
  const job = await Job.findById(jobId).populate("userId", "fullName profilePhoto mobile");
  if (!job) {
    throw new Error("Job not found");
  }
  return job;
};


const updateJob = async (jobId, updateData, files, userId) => {
  const job = await Job.findById(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized access");
  }

  let updatedImages = job.images;

  if (files && files.length > 0) {
    const newImages = files.map((file) => file.filename);
    updatedImages = [...updatedImages, ...newImages];
  }

  const dataToSave = {
    ...updateData,
    images: updatedImages,
  };

  const updatedJob = await Job.findByIdAndUpdate(jobId, dataToSave, { new: true });
  return updatedJob;
};

module.exports = { createJob, getAllJobs, getJobById , updateJob};