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
const getAllBusinesses = async (page = 1, limit = 10, lat, lng, radius = null) => {
  try {
    const skip = (page - 1) * limit;
    let pipeline = [];

    if (lat && lng) {
      const geoNearStage = {
        near: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: "distance",
        query: { status: 'Approved', isBlocked: { $ne: true } },
        spherical: true,
      };

      if (radius) {
        geoNearStage.maxDistance = radius * 1000;
      }

      pipeline.push({
        $geoNear: geoNearStage,
      });
    } else {
      pipeline.push({ $match: { status: 'Approved', isBlocked: { $ne: true } } });
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const result = await Business.aggregate(pipeline);
    const businesses = result[0].data;
    const totalBusinesses = result[0].metadata[0]?.total || 0;

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
    let business = await Business.findById(id);
    if (!business) return null;

    // Auto-sync: if business status is Approved (even if set directly in DB) but trial is not active yet
    const isApproved = Array.isArray(business.status)
      ? business.status.some(s => s && s.toLowerCase() === 'approved')
      : (typeof business.status === 'string' && business.status.toLowerCase() === 'approved');

    const isPaid = ["Pro+", "Lite"].includes(business.subscription?.planName);
    const hasValidTrial = business.subscription?.planName === "Trial" && business.subscription?.expiryDate && new Date(business.subscription.expiryDate) > new Date();

    if (isApproved && !isPaid && !hasValidTrial && (!business.subscription || business.subscription.planName === "None" || !business.subscription.expiryDate)) {
      const trialExpiry = new Date();
      trialExpiry.setMonth(trialExpiry.getMonth() + 1);

      business = await Business.findByIdAndUpdate(
        id,
        {
          $set: {
            "subscription.planName": "Trial",
            "subscription.planType": "Trial",
            "subscription.expiryDate": trialExpiry,
            "subscription.isTrialUsed": true,
            badge: ["Trial"]
          }
        },
        { new: true }
      );
    }

    return business;
  } catch (error) {
    throw error;
  }
};

// 4. Update Business
const updateBusiness = async (id, data) => {
  return Business.findByIdAndUpdate(id, data, { new: true, runValidators: true });
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
      .sort({ createdAt: 1 })
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
    const business = await Business.findById(id);
    if (!business) return null;

    let updateFields = { status: newStatus };

    const currentPlan = business.subscription?.planName;
    const isPaidPlan = ["Pro+", "Lite"].includes(currentPlan);
    const hasActiveTrial = currentPlan === "Trial" && business.subscription?.expiryDate && new Date(business.subscription.expiryDate) > new Date();

    const shouldActivateTrial = newStatus === "Approved" && !isPaidPlan && !hasActiveTrial;
    if (shouldActivateTrial) {
      const trialExpiry = new Date();
      trialExpiry.setMonth(trialExpiry.getMonth() + 1);

      updateFields["subscription.planName"] = "Trial";
      updateFields["subscription.planType"] = "Trial";
      updateFields["subscription.expiryDate"] = trialExpiry;
      updateFields["subscription.isTrialUsed"] = true;
      updateFields["badge"] = ["Trial"];
    }

    const updated = await Business.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    // Send push notification when approved
    if (newStatus === "Approved") {
      try {
        const User = require("../models/User");
        const user = await User.findById(business.userId);
        if (user && user.fcmToken) {
          const { sendNotification } = require("../utils/notification");
          await sendNotification(
            user.fcmToken,
            "Free Trial Activated",
            "your free trail is activated",
            { type: "BUSINESS_APPROVAL", businessId: business._id.toString() }
          );
        }
      } catch (notifErr) {
        console.error("Error sending approval notification:", notifErr.message);
      }
    }

    return updated;
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Auto-sync trial if status is Approved but trial fields not set yet (e.g. updated directly in DB)
    for (let i = 0; i < businesses.length; i++) {
      const b = businesses[i];
      const isApproved = Array.isArray(b.status)
        ? b.status.some(s => s && s.toLowerCase() === 'approved')
        : (typeof b.status === 'string' && b.status.toLowerCase() === 'approved');
      const isPaid = ["Pro+", "Lite"].includes(b.subscription?.planName);
      const hasValidTrial = b.subscription?.planName === "Trial" && b.subscription?.expiryDate && new Date(b.subscription.expiryDate) > new Date();

      if (isApproved && !isPaid && !hasValidTrial && (!b.subscription || b.subscription.planName === "None" || !b.subscription.expiryDate)) {
        const trialExpiry = new Date();
        trialExpiry.setMonth(trialExpiry.getMonth() + 1);

        businesses[i] = await Business.findByIdAndUpdate(
          b._id,
          {
            $set: {
              "subscription.planName": "Trial",
              "subscription.planType": "Trial",
              "subscription.expiryDate": trialExpiry,
              "subscription.isTrialUsed": true,
              badge: ["Trial"]
            }
          },
          { new: true }
        );
      }
    }

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


// Background image update karne ke liye
const updateBackgroundImage = async (businessId, imageUrl) => {
  try {
    return await Business.findByIdAndUpdate(
      businessId,
      { backgroundImage: imageUrl },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

// Background image remove karne ke liye
const removeBackgroundImage = async (businessId) => {
  try {
    return await Business.findByIdAndUpdate(
      businessId,
      { backgroundImage: "" },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

// Service mein nayi images add karne ke liye
const addImagesToService = async (businessId, serviceId, imageUrls) => {
  try {
    return await Business.findOneAndUpdate(
      { _id: businessId, "services._id": serviceId },
      { $push: { "services.$.serviceImages": { $each: imageUrls } } },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

// Service se koi specific image remove karne ke liye
const removeImageFromService = async (businessId, serviceId, imageUrl) => {
  try {
    return await Business.findOneAndUpdate(
      { _id: businessId, "services._id": serviceId },
      { $pull: { "services.$.serviceImages": imageUrl } },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

// Business ki main images array mein aur images add karna
const addImagesToBusiness = async (businessId, imageUrls) => {
  try {
    return await Business.findByIdAndUpdate(
      businessId,
      { $push: { businessImages: { $each: imageUrls } } },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

// Business ki main images array se specific image delete karna
const removeImageFromBusiness = async (businessId, imageUrl) => {
  try {
    return await Business.findByIdAndUpdate(
      businessId,
      { $pull: { businessImages: imageUrl } },
      { new: true }
    );
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
  deleteService,
  updateService,
  getBusinessesByUserId,
  updateBackgroundImage,
  removeBackgroundImage,
  addImagesToService,
  removeImageFromService,
  addImagesToBusiness,
  removeImageFromBusiness

};