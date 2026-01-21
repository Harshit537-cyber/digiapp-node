// services/bloodRequest.services.js

const BloodRequest = require("../models/BloodRequest");

const createBloodRequest = async (data) => {
  return await BloodRequest.create(data);
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
  return await BloodRequest.find().sort({ createdAt: -1 });
};

const getBloodRequestById = async (id) => {
  return await BloodRequest.findById(id);
};

const getRequestsByUserId = async (userId) => {
  return await BloodRequest.find({ userId: userId }).sort({ createdAt: -1 });
};

const updateRequestStatus = async (id, status) => {
  return await BloodRequest.findByIdAndUpdate(
    id,
    { status: status },
    { new: true, runValidators: true }
  );
};


const searchBloodRequests = async (filters) => {
  try {
   
    return await BloodRequest.find(filters).sort({ createdAt: -1 });
  } catch (error) {
    throw error;
  }
};

// Sab exports ek saath niche likhein
module.exports = {
  createBloodRequest,
  updateBloodRequest,
  deleteBloodRequestById,
  getAllBloodRequests,
  getBloodRequestById,
  getRequestsByUserId,
  updateRequestStatus,
  searchBloodRequests
};