const fs = require("fs");
const Business = require('../../models/Business');
const User = require('../../models/User');
const cloudinary = require("../../config/cloudinary");


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


         const total = await Business.countDocuments();

        const businesses = await Business.find().sort({ createdAt: -1 })
        .skip(skip)
            .limit(limit);
        res.status(200).json({
            success: true,
            count: businesses.length,
              pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: businesses
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
        const { userId, businessName } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "Target User ID is required." });
        }
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "The target user does not exist." });
        }

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
                        // DHAYAN DEIN: Yahan 'serviceImages' (plural) use karein 
                        // kyunki aapke schema/response mein yahi naam hai.
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

// --- TOGGLE STATUS ---
exports.toggleBlockBusiness = async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) return res.status(404).json({ success: false, message: "Business not found." });

        business.status = business.status === 'Approved' ? 'Rejected' : 'Approved';
        await business.save();

        res.status(200).json({ success: true, message: `Status: ${business.status}`, data: business });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
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