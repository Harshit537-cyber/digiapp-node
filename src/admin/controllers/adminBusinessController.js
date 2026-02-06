const Business = require('../../models/Business');
const User = require('../../models/User');

// --- GET ALL BUSINESSES ---
exports.getAllBusiness = async (req, res) => {
    try {
        const businesses = await Business.find().sort({ createdAt: -1 }); // Using 'createdAt' is a common convention

        res.status(200).json({
            success: true,
            count: businesses.length,
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

        let businessData = { ...req.body };

        // Handle file uploads from Multer
        if (req.files) {
            if (req.files.businessImages) {
                businessData.businessImages = req.files.businessImages.map(file => file.filename);
            }
            if (req.files.nationalIdImage) {
                businessData.nationalIdImage = req.files.nationalIdImage[0].filename;
            }
            if (req.files.ownerImage) {
                businessData.ownerImage = req.files.ownerImage[0].filename;
            }
        }

        // Since admin creates it, set status directly to 'Approved'
        businessData.status = 'Approved';

        const newBusiness = new Business(businessData);
        await newBusiness.save();

        res.status(201).json({
            success: true,
            message: `Shop '${businessName}' created successfully for user ${targetUser.name}`,
            data: newBusiness
        });

    } catch (error) {
        console.error("Admin Shop Creation Error:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};


// --- UPDATE AN EXISTING BUSINESS (HANDLES FILE UPLOADS) ---
exports.updateBusiness = async (req, res) => {
    try {
        let business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }

        let updateData = { ...req.body };

        // Check for and handle new file uploads
        if (req.files) {
             if (req.files.businessImages) {
                updateData.businessImages = req.files.businessImages.map(file => file.filename);
            }
            if (req.files.nationalIdImage) {
                updateData.nationalIdImage = req.files.nationalIdImage[0].filename;
            }
            if (req.files.ownerImage) {
                updateData.ownerImage = req.files.ownerImage[0].filename;
            }
        }
        
        const updatedBusiness = await Business.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, // Use $set to avoid replacing the whole document
            { new: true, runValidators: true, context: 'query' }
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
        console.error("Error deleting business:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- TOGGLE BUSINESS STATUS (e.g., from Approved to Rejected) ---
exports.toggleBlockBusiness = async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found." });
        }

        // Toggle status between 'Approved' and 'Rejected'
        business.status = business.status === 'Approved' ? 'Rejected' : 'Approved';

        await business.save(); // Correctly save the instance

        res.status(200).json({
            success: true,
            message: `Business status changed to ${business.status}`,
            data: business
        });

    } catch (error) {
        console.error("Error toggling business status:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};


// --- (NEW) ADD A SERVICE TO A BUSINESS ---
exports.addServiceToBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { serviceTitle, serviceDetails } = req.body;

        // 1. Validate text inputs
        if (!serviceTitle || !serviceDetails) {
            return res.status(400).json({ 
                success: false, 
                message: "Service Title and Details are required." 
            });
        }

        // 2. Validate that a file was uploaded (multer places it in req.file)
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "A service image is required." 
            });
        }
        
        // The filename is provided by multer after it saves the file
        const serviceImage = req.file.filename;

        // 3. Find the business and push the new service, including the image filename
        const updatedBusiness = await Business.findByIdAndUpdate(
            businessId,
            {
                $push: { 
                    services: { 
                        serviceTitle, 
                        serviceDetails,
                        serviceImage // Add the new image field
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
            message: "Service with image added successfully.",
            data: updatedBusiness
        });

    } catch (error) {
        console.error("Error adding service:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};