const BloodRequest = require("../models/BloodRequest");

const createBloodRequest = async (data) => {
  return await BloodRequest.create(data);
};

module.exports = {
  createBloodRequest,
};


const updateBloodRequest = async (id, updateData) => {

  return await BloodRequest.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

const deleteBloodRequestById = async (id) => {
  return await BloodRequest.findByIdAndDelete(id);
};


const getAllBloodRequests = async () => {
  return await BloodRequest.find().sort({ createdAt: -1 }); // newest first
};


/* 🔹 GET single blood request by ID */
const getBloodRequestById = async (id) => {
  return await BloodRequest.findById(id);
};

module.exports = {
  createBloodRequest,
  updateBloodRequest,
  deleteBloodRequestById,
  getAllBloodRequests,
  getBloodRequestById,
};