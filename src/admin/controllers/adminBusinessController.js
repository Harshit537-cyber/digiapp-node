const fs = require("fs");
const Business = require('../../models/Business');
const User = require('../../models/User');
const cloudinary = require("../../config/cloudinary");
const BusinessCategory = require("../../admin/models/BusinessCategory");
const mongoose = require("mongoose");

const uploadToCloudinary = async (filePath) => {
    if (!filePath) return null;
    try {
        const { secure_url } = await cloudinary.uploader.upload(filePath, {
            folder: "business_directory",
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return secure_url;
    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw err;
    }
};


// --- GET ALL BUSINESSES ---
exports.getAllBusiness = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [
            total,
            proPlusCount,
            liteCount,
            trialCount,
            pendingCount,
            approvedCount,
            rejectedCount,
            businesses
        ] = await Promise.all([
            Business.countDocuments(),
            Business.countDocuments({ "subscription.planName": { $in: ["Pro+", "Pro Plus", "pro+"] } }),
            Business.countDocuments({ "subscription.planName": { $regex: /^lite$/i } }),
            Business.countDocuments({ "subscription.planName": { $regex: /^(trial|trail)$/i } }),
            Business.countDocuments({ status: { $in: ["Pending", "pending"] } }),
            Business.countDocuments({ status: { $in: ["Approved", "approved"] } }),
            Business.countDocuments({ status: { $in: ["Rejected", "rejected"] } }),
            Business.find()
                .populate('category', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const formattedBusinesses = businesses.map(b => {
            const catName = b.category && typeof b.category === 'object' ? b.category.name : b.category;
            const catId = b.category && typeof b.category === 'object' ? b.category._id : b.category;
            return {
                ...b,
                categoryId: catId,
                categoryName: catName || null,
                category: catName || b.category
            };
        });

        res.status(200).json({
            success: true,
            counts: {
                totalShops: total,
                proPlus: proPlusCount,
                trial: trialCount,
                lite: liteCount,
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount
            },
            count: formattedBusinesses.length,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: formattedBusinesses
        });
    } catch (error) {
        console.error("Error fetching businesses:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- GET A SINGLE BUSINESS BY ID ---
exports.getBusinessById = async (req, res) => {
    try {
        const business = await Business.findById(req.params.id).populate('userId', 'name email');
        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found with this ID." });
        }
        res.status(200).json({ success: true, data: business });
    } catch (error) {
        console.error("Error fetching business by ID:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- CREATE A NEW BUSINESS (BY ADMIN) ---
exports.createBusinessByAdmin = async (req, res) => {
    try {
        const {  userId, businessName, category, subCategory } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "Target User ID is required." });
        }
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "The target user does not exist." });
        }

        if (!category || !subCategory) {
  return res.status(400).json({ success: false, message: "Category and subCategory are required." });
}
if (!mongoose.Types.ObjectId.isValid(category)) {
  return res.status(400).json({ success: false, message: "Invalid category ID." });
}

const categoryDoc = await BusinessCategory.findById(category);
if (!categoryDoc) {
  return res.status(404).json({ success: false, message: "Category not found." });
}
if (!categoryDoc.status) {
  return res.status(400).json({ success: false, message: "This category is inactive." });
}

// SubCategory validation
const cleanSubCategory = String(subCategory).trim();
if (!categoryDoc.subCategory.includes(cleanSubCategory)) {
  return res.status(400).json({
    success: false,
    message: `SubCategory '${cleanSubCategory}' does not belong to category '${categoryDoc.name}'.`,
  });
}

// Location parse + validate
let location = req.body.location;
if (typeof location === "string") {
  try {
    location = JSON.parse(location);
  } catch (e) {
    return res.status(400).json({ success: false, message: "Location must be valid JSON." });
  }
}
if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
  return res.status(400).json({
    success: false,
    message: "Location must be { type: 'Point', coordinates: [longitude, latitude], address }.",
  });
}
const [lng, lat] = location.coordinates.map(Number);
if (Number.isNaN(lng) || Number.isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
  return res.status(400).json({ success: false, message: "Invalid coordinates. Use [longitude, latitude]." });
}
const finalLocation = {
  type: "Point",
  coordinates: [lng, lat],
  address: location.address || "",
};


        const { businessImages, nationalIdImage, ownerImage } = req.files || {};

        let businessImageUrls = [];
        let nationalIdUrl = "";
        let ownerImageUrl = "";

        if (businessImages) {
            businessImageUrls = await Promise.all(
                businessImages.map((file) => uploadToCloudinary(file.path))
            );
        }

        if (nationalIdImage) {
            nationalIdUrl = await uploadToCloudinary(nationalIdImage[0].path);
        }

        if (ownerImage) {
            ownerImageUrl = await uploadToCloudinary(ownerImage[0].path);
        }

        const businessData = {
            ...req.body,
            userId: userId,
            businessImages: businessImageUrls,
            nationalIdImage: nationalIdUrl,
            category: categoryDoc._id,        // new
    subCategory: cleanSubCategory,    // new
    location: finalLocation,  
            ownerImage: ownerImageUrl,
            status: 'Approved'
        };

        const newBusiness = new Business(businessData);
        await newBusiness.save();

        res.status(201).json({
            success: true,
            message: `Shop '${businessName}' created successfully for user ${targetUser.name}`,
            data: newBusiness
        });

    } catch (error) {
        console.error("Admin Shop Creation Error:", error);
        res.status(500).json({ success: false, message: "An error occurred", error: error.message });
    }
};

// --- UPDATE AN EXISTING BUSINESS (CLOUDINARY ENABLED) ---
exports.updateBusiness = async (req, res) => {
    try {
        let business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }

        let updateData = { ...req.body };

        // Handle Image Uploads to Cloudinary
        if (req.files) {
            if (req.files.businessImages) {
                updateData.businessImages = await Promise.all(
                    req.files.businessImages.map(file => uploadToCloudinary(file.path))
                );
            }
            if (req.files.nationalIdImage) {
                updateData.nationalIdImage = await uploadToCloudinary(req.files.nationalIdImage[0].path);
            }
            if (req.files.ownerImage) {
                updateData.ownerImage = await uploadToCloudinary(req.files.ownerImage[0].path);
            }
        }

        let normalizedNewStatus = null;
        if (updateData.status) {
            const rawStatus = Array.isArray(updateData.status) ? updateData.status[0] : updateData.status;
            if (typeof rawStatus === 'string') {
                normalizedNewStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
                updateData.status = normalizedNewStatus;
            }
        }

        if (normalizedNewStatus === "Approved") {
            const currentPlan = business.subscription?.planName;
            const isPaidPlan = ["Pro+", "Lite"].includes(currentPlan);
            const hasActiveTrial = currentPlan === "Trial" && business.subscription?.expiryDate && new Date(business.subscription.expiryDate) > new Date();

            if (!isPaidPlan && !hasActiveTrial) {
                const trialExpiry = new Date();
                trialExpiry.setMonth(trialExpiry.getMonth() + 1);

                updateData["subscription.planName"] = "Trial";
                updateData["subscription.planType"] = "Trial";
                updateData["subscription.expiryDate"] = trialExpiry;
                updateData["subscription.isTrialUsed"] = true;
                updateData["badge"] = ["Trial"];

                try {
                    const User = require("../../models/User");
                    const user = await User.findById(business.userId);
                    if (user && user.fcmToken) {
                        const { sendNotification } = require("../../utils/notification");
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
        }

        const updatedBusiness = await Business.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, message: "Business updated successfully.", data: updatedBusiness });

    } catch (error) {
        console.error("Error updating business:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- DELETE A BUSINESS ---
exports.deleteBusiness = async (req, res) => {
    try {
        const business = await Business.findByIdAndDelete(req.params.id);
        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }
        res.status(200).json({ success: true, message: "Business deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- (SERVICE MANAGEMENT) ADD A NEW SERVICE ---
exports.addServiceToBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { serviceTitle, serviceDetails } = req.body;

        if (!serviceTitle || !serviceDetails) {
            return res.status(400).json({ success: false, message: "Details are required." });
        }

        // Check if file exists
        if (!req.file) {
            return res.status(400).json({ success: false, message: "A service image is required." });
        }
        
        // 1. Cloudinary par upload karein
        const serviceImageUrl = await uploadToCloudinary(req.file.path);

        // 2. Database mein update karein
        const updatedBusiness = await Business.findByIdAndUpdate(
            businessId,
            {
                $push: { 
                    services: { 
                        serviceTitle, 
                        serviceDetails,
                        serviceImages: [serviceImageUrl] 
                    }
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }

        res.status(200).json({
            success: true,
            message: "New Service added successfully.",
            data: updatedBusiness.services[updatedBusiness.services.length - 1]
        });

    } catch (error) {
        console.error("Error adding service:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- (SERVICE MANAGEMENT) UPDATE AN EXISTING SERVICE ---
exports.updateServiceInBusiness = async (req, res) => {
    try {
        const { businessId, serviceId } = req.params;
        const { serviceTitle, serviceDetails } = req.body;

        let updateFields = {};
        if (serviceTitle) updateFields['services.$.serviceTitle'] = serviceTitle;
        if (serviceDetails) updateFields['services.$.serviceDetails'] = serviceDetails;

        // If new image provided, upload to Cloudinary
        if (req.file) {
            updateFields['services.$.serviceImage'] = await uploadToCloudinary(req.file.path);
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ success: false, message: "No update fields provided." });
        }

        const updatedBusiness = await Business.findOneAndUpdate(
            { "_id": businessId, "services._id": serviceId },
            { $set: updateFields },
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ success: false, message: "Business or Service not found." });
        }

        res.status(200).json({
            success: true,
            message: "Service updated successfully.",
            data: updatedBusiness.services.find(s => s._id.toString() === serviceId)
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- DELETE A SERVICE ---
exports.deleteServiceInBusiness = async (req, res) => {
    try {
        const { businessId, serviceId } = req.params;
        const updatedBusiness = await Business.findByIdAndUpdate(
            businessId,
            { $pull: { services: { _id: serviceId } } },
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }

        res.status(200).json({ success: true, message: "Service deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- SET BACKGROUND IMAGE ---
exports.setBackgroundImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload an image" });
        }

        const imageUrl = await uploadToCloudinary(req.file.path);

        const updatedBusiness = await Business.findByIdAndUpdate(
            id,
            { backgroundImage: imageUrl },
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ success: false, message: "Business not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Background image updated successfully",
            backgroundImage: updatedBusiness.backgroundImage
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error updating background image", error: error.message });
    }
};

// --- REMOVE BACKGROUND IMAGE ---
exports.deleteBackgroundImage = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBusiness = await Business.findByIdAndUpdate(
            id,
            { $unset: { backgroundImage: "" } },
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ success: false, message: "Business not found" });
        }

        return res.status(200).json({ success: true, message: "Background image removed successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error removing image", error: error.message });
    }
};

// --- TOGGLE / UPDATE STATUS ---
exports.toggleBlockBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const business = await Business.findById(id);
        if (!business) return res.status(404).json({ success: false, message: "Business not found." });

        const validStatuses = ["Pending", "Approved", "Rejected", "Expired", "Active"];
        let targetStatus = req.body?.status || req.query?.status;

        if (Array.isArray(targetStatus) && targetStatus.length > 0) {
            targetStatus = targetStatus[0];
        }

        let newStatus;
        if (targetStatus && typeof targetStatus === "string") {
            const trimmed = targetStatus.trim();
            const matched = validStatuses.find(s => s.toLowerCase() === trimmed.toLowerCase());
            if (!matched) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status! Allowed statuses are: ${validStatuses.join(", ")}`
                });
            }
            newStatus = matched;
        } else {
            // No status passed -> toggle between Approved and Rejected
            const isCurrentlyApproved = Array.isArray(business.status)
                ? business.status.some(s => s && s.toLowerCase() === "approved")
                : (typeof business.status === "string" && business.status.toLowerCase() === "approved");
            newStatus = isCurrentlyApproved ? "Rejected" : "Approved";
        }

        business.status = [newStatus];

        // If new status is Approved, activate Free Trial if not already paid/active
        if (newStatus === "Approved") {
            const currentPlan = business.subscription?.planName;
            const isPaidPlan = ["Pro+", "Lite"].includes(currentPlan);
            const hasActiveTrial = currentPlan === "Trial" && business.subscription?.expiryDate && new Date(business.subscription.expiryDate) > new Date();

            if (!isPaidPlan && !hasActiveTrial) {
                const trialExpiry = new Date();
                trialExpiry.setMonth(trialExpiry.getMonth() + 1);

                business.subscription = business.subscription || {};
                business.subscription.planName = "Trial";
                business.subscription.planType = "Trial";
                business.subscription.expiryDate = trialExpiry;
                business.subscription.isTrialUsed = true;
                business.badge = ["Trial"];
            }

            try {
                const User = require("../../models/User");
                const user = await User.findById(business.userId);
                if (user && user.fcmToken) {
                    const { sendNotification } = require("../../utils/notification");
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

        await business.save();

        return res.status(200).json({
            success: true,
            message: `Business status successfully updated to ${newStatus}`,
            data: business
        });
    } catch (error) {
        console.error("Error toggling business status:", error);
        return res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};


exports.getBusinessServices = async (req, res) => {
    try {
        const { businessId } = req.params;
        const business = await Business.findById(businessId).select('businessName services');

        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }

        res.status(200).json({
            success: true,
            businessName: business.businessName,
            count: business.services.length,
            data: business.services
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};


exports.updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params; 
    const { status } = req.body; 

    if (Array.isArray(status) && status.length > 0) {
      status = status[0];
    }
    if (typeof status === "string") {
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    const validStatuses = ["Pending", "Approved", "Rejected", "Expired", "Active"];
    let matchedStatus = null;
    if (typeof status === "string") {
      matchedStatus = validStatuses.find(s => s.toLowerCase() === status.trim().toLowerCase());
    }
    if (!matchedStatus) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status! Allowed statuses are: ${validStatuses.join(", ")}` 
      });
    }
    status = matchedStatus;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: "Business not found!" 
      });
    }

    let updateFields = { status: status };

    const currentPlan = business.subscription?.planName;
    const isPaidPlan = ["Pro+", "Lite"].includes(currentPlan);
    const hasActiveTrial = currentPlan === "Trial" && business.subscription?.expiryDate && new Date(business.subscription.expiryDate) > new Date();

    // If status is Approved and not currently on an active paid plan or active trial, activate 1-month Free Trial
    const shouldActivateTrial = status === "Approved" && !isPaidPlan && !hasActiveTrial;
    if (shouldActivateTrial) {
      const trialExpiry = new Date();
      trialExpiry.setMonth(trialExpiry.getMonth() + 1);

      updateFields["subscription.planName"] = "Trial";
      updateFields["subscription.planType"] = "Trial";
      updateFields["subscription.expiryDate"] = trialExpiry;
      updateFields["subscription.isTrialUsed"] = true;
      updateFields["badge"] = ["Trial"];
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true } 
    );

    // Send push notification when approved and free trial is active
    if (status === "Approved") {
      try {
        const user = await User.findById(business.userId);
        if (user && user.fcmToken) {
          const { sendNotification } = require("../../utils/notification");
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

    res.status(200).json({
      success: true,
      message: `Business status successfully updated to ${status}`,
      data: updatedBusiness
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server Error", 
      error: error.message 
    });
  }
};