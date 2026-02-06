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
const getAllBusinesses = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    // Find only businesses with 'Approved' status
    const businesses = await Business.find({ status: 'Approved' }) // <<<--- ADD THIS FILTER
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count only the 'Approved' businesses
    const totalBusinesses = await Business.countDocuments({ status: 'Approved' }); // <<<--- ADD THIS FILTER

    return {
      businesses,
      totalBusinesses,
      totalPages: Math.ceil(totalBusinesses / limit),
      currentPage: page
    };
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

const getPendingBusinesses = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    const businesses = await Business.find({ status: 'Pending' })
      .sort({ createdAt: 1 }) // Oldest first for review
      .skip(skip)
      .limit(limit);

    const totalBusinesses = await Business.countDocuments({ status: 'Pending' });

    return {
      businesses,
      totalBusinesses,
      totalPages: Math.ceil(totalBusinesses / limit),
      currentPage: page
    };
  } catch (error) {
    throw error;
  }
};

// 7. Update Business Status (Approve/Reject)
const updateBusinessStatus = async (id, newStatus) => {
    // newStatus should be 'Approved' or 'Rejected'
    if (!['Approved', 'Rejected'].includes(newStatus)) {
        throw new Error("Invalid status update.");
    }
    try {
        return await Business.findByIdAndUpdate(
            id, 
            { status: newStatus }, 
            { new: true }
        );
    } catch (error) {
        throw error;
    }
}


const addService = async (businessId, serviceData) => {
  try {
    return await Business.findByIdAndUpdate(
      businessId,
      { $push: { services: serviceData } }, 
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

const deleteService = async (businessId, serviceId) => {
  try {
    return await Business.findByIdAndUpdate(
      businessId,
      { $pull: { services: { _id: serviceId } } }, 
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

const updateService = async (businessId, serviceId, updateFields) => {
  try {
    
    const updateObj = {};
    for (const key in updateFields) {
      updateObj[`services.$.${key}`] = updateFields[key];
    }

    return await Business.findOneAndUpdate(
      { _id: businessId, "services._id": serviceId },
      { $set: updateObj }, 
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};


const getBusinessesByUserId = async (userId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

   
    const businesses = await Business.find({ userId: userId })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    const totalBusinesses = await Business.countDocuments({ userId: userId });

    return {
      businesses,
      totalBusinesses,
      totalPages: Math.ceil(totalBusinesses / limit),
      currentPage: page
    };
  } catch (error) {
    throw error;
  }
};


module.exports = {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getPendingBusinesses,
  updateBusinessStatus,
  addService,
 deleteService ,
 updateService ,
  getBusinessesByUserId, 

};