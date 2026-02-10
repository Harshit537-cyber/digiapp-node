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
        const businesses = await Business.find().sort({ createdAt: -1 }); 

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

    // 1. Check if Target User exists
    if (!userId) {
      return res.status(400).json({ success: false, message: "Target User ID is required." });
    }
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "The target user does not exist." });
    }

    // 2. Extract Files from req.files
    const { businessImages, nationalIdImage, ownerImage } = req.files || {};

    let businessImageUrls = [];
    let nationalIdUrl = "";
    let ownerImageUrl = "";

    // 3. Upload Images to Cloudinary if they exist
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

    // 4. Prepare Business Data
    const businessData = {
      ...req.body,
      userId: userId,
      businessImages: businessImageUrls,
      nationalIdImage: nationalIdUrl,
      ownerImage: ownerImageUrl,
      status: 'Approved' // Admin बना रहा है इसलिए direct Approved
    };

    // 5. Save to Database
    const newBusiness = new Business(businessData);
    await newBusiness.save();

    res.status(201).json({
      success: true,
      message: `Shop '${businessName}' created successfully for user ${targetUser.name}`,
      data: newBusiness
    });

  } catch (error) {
    console.error("Admin Shop Creation Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An error occurred during admin business creation", 
      error: error.message 
    });
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
        
        // IMPORTANT: This only handles general business fields and top-level file uploads.
        // Service updates are now handled in separate endpoints.
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


// --- (SERVICE MANAGEMENT) ADD A NEW SERVICE TO A BUSINESS ---
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
            message: "New Service added successfully.",
            data: updatedBusiness.services[updatedBusiness.services.length - 1] // Return the new service object
        });

    } catch (error) {
        console.error("Error adding service:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};


// --- (SERVICE MANAGEMENT) UPDATE AN EXISTING SERVICE IN A BUSINESS ---
exports.updateServiceInBusiness = async (req, res) => {
    try {
        const { businessId, serviceId } = req.params;
        const { serviceTitle, serviceDetails } = req.body;

        // Start with the fields to update from the body
        let updateFields = {};
        if (serviceTitle) updateFields['services.$.serviceTitle'] = serviceTitle;
        if (serviceDetails) updateFields['services.$.serviceDetails'] = serviceDetails;

        // Handle the image file upload
        if (req.file) {
            updateFields['services.$.serviceImage'] = req.file.filename;
        }

        // Check if there's anything to update
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No update fields or image provided." 
            });
        }

        // Use arrayFilters to update a specific nested document
        const updatedBusiness = await Business.findOneAndUpdate(
            { "_id": businessId, "services._id": serviceId }, // Find the business AND the specific service
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedBusiness) {
            // Check if business exists or service exists
            const businessExists = await Business.findById(businessId);
            if (!businessExists) {
                 return res.status(404).json({ success: false, message: "Business not found." });
            }
            return res.status(404).json({ success: false, message: "Service not found with that ID in the business." });
        }

        res.status(200).json({
            success: true,
            message: "Service updated successfully.",
            data: updatedBusiness.services.find(s => s._id.toString() === serviceId) // Return the updated service
        });

    } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// --- (SERVICE MANAGEMENT) DELETE A SERVICE FROM A BUSINESS ---
exports.deleteServiceInBusiness = async (req, res) => {
    try {
        const { businessId, serviceId } = req.params;

        const updatedBusiness = await Business.findByIdAndUpdate(
            businessId,
            {
                $pull: {
                    services: { _id: serviceId } // Pull the service with the specific _id
                }
            },
            { new: true }
        );

        if (!updatedBusiness) {
             return res.status(404).json({ success: false, message: "Business not found." });
        }

        res.status(200).json({
            success: true,
            message: "Service deleted successfully.",
            data: updatedBusiness // Return the updated business
        });

    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};


// --- Update Background Image ---
exports.setBackgroundImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const bgImageFile = req.file;

    if (!bgImageFile) {
      return res.status(400).json({ success: false, message: "Please upload an image" });
    }

    const business = await businessService.getBusinessById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Owner check
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to change background" });
    }

    const imageUrl = await uploadToCloudinary(bgImageFile.path);
    const updatedBusiness = await businessService.updateBackgroundImage(id, imageUrl);

    return res.status(200).json({
      success: true,
      message: "Background image updated successfully",
      backgroundImage: updatedBusiness.backgroundImage
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating background image", error: error.message });
  }
};

// --- Remove Background Image ---
exports.deleteBackgroundImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const business = await businessService.getBusinessById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

    await businessService.removeBackgroundImage(id);

    return res.status(200).json({
      success: true,
      message: "Background image removed successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error removing image", error: error.message });
  }
};

