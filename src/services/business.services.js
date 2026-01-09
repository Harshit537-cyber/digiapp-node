const Business = require('../models/Business');

// 1. Create Business (Existing)
const createBusiness = async (data) => {
  try {
    const business = new Business(data);
    return await business.save();
  } catch (error) {
    throw error;
  }
};

// 2. Get All Businesses
const getAllBusinesses = async () => {
  try {
    // Aap chahein to .populate('userId') use kar sakte hain agar user details bhi chahiye
    return await Business.find().sort({ createdAt: -1 });
  } catch (error) {
    throw error;
  }
};

// 3. Get Business By ID
const getBusinessById = async (id) => {
  try {
    return await Business.findById(id);
  } catch (error) {
    throw error;
  }
};

// 4. Update Business
const updateBusiness = async (id, data) => {
  try {
    return await Business.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw error;
  }
};

// 5. Delete Business
const deleteBusiness = async (id) => {
  try {
    return await Business.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness
};