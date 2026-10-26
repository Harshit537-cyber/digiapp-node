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

const getAllBloodRequests = async (lat, lng) => {
  const now = new Date();
  const matchActive = {
    status: "Active",
    $or: [
      { expiresAt: { $gt: now } },
      { expiresAt: { $exists: false } },
      { expiresAt: null },
    ],
  };

  if (lat && lng) {
    const userCoordinates = [parseFloat(lng), parseFloat(lat)];

    return await BloodRequest.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: userCoordinates },
          distanceField: "distance",
          maxDistance: 10000,
          spherical: true,
        },
      },
      {
        $match: matchActive,
      },
      {
        $addFields: {
          distanceInKm: {
            $round: [{ $divide: ["$distance", 1000] }, 2],
          },
          expiresAt: {
            $ifNull: [
              "$expiresAt",
              {
                $cond: {
                  if: {
                    $and: [
                      "$createdAt",
                      {
                        $gt: [
                          { $add: ["$createdAt", 7 * 24 * 60 * 60 * 1000] },
                          now,
                        ],
                      },
                    ],
                  },
                  then: { $add: ["$createdAt", 7 * 24 * 60 * 60 * 1000] },
                  else: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              },
            ],
          },
        },
      },
      {
        $sort: {
          distance: 1,
          createdAt: -1,
        },
      },
    ]);
  }

  return await BloodRequest.find(matchActive).sort({ createdAt: -1 });
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


const getUrgentAndLast24HoursRequests = async () => {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return await BloodRequest.find({
    status: "Active",
    $or: [
      { urgency: { $in: ["Urgent", "Critical"] } },
      { createdAt: { $gte: last24Hours } }
    ]
  }).sort({ createdAt: -1 });
};


module.exports = {
  createBloodRequest,
  updateBloodRequest,
  deleteBloodRequestById,
  getAllBloodRequests,
  getBloodRequestById,
  getRequestsByUserId,
  updateRequestStatus,
  searchBloodRequests,
  getUrgentAndLast24HoursRequests
};