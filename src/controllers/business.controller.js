const fs = require("fs");
const businessService = require("../services/business.services");
const cloudinary = require("../config/cloudinary");
const Business = require("../models/Business");
const mongoose = require("mongoose");
// --- Helper Function: Upload to Cloudinary ---
const uploadToCloudinary = async (filePath) => {
  if (!filePath) return null;
  try {
    const { secure_url } = await cloudinary.uploader.upload(filePath, {
      folder: "business_directory",
    });
    // Remove file from local server after successful upload
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return secure_url;
  } catch (err) {
    // Remove file from local server even if upload fails
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw err;
  }
};

// --- Helper Function: Get User ID from Request ---
const getUserId = (req) => req.user?.userId || req.user?._id || req.user?.id;

// --- 1. Register Business ---
const registerBusiness = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication failed" });
    }
    console.log(req.body)
   
    const { businessName, details, category, location, address, ownerName, mobileNumber, whatsappNumber } = req.body;
    const { businessImages, nationalId, ownerImage } = req.files || {};
     console.log('bussiness id : ', businessImages, nationalId, ownerImage );
     console.log(businessImages,nationalId,ownerImage)

    if (!businessImages || !nationalId || !ownerImage) {
      return res.status(400).json({ success: false, message: "Please upload all required images (Business, ID, and Owner)" });
    }

  
    const businessImageUrls = await Promise.all(
      businessImages.map((file) => uploadToCloudinary(file.path))
    );
    const nationalIdUrl = await uploadToCloudinary(nationalId[0].path);
    const ownerImageUrl = await uploadToCloudinary(ownerImage[0].path);

  const trialExpiry = new Date();
    trialExpiry.setMonth(trialExpiry.getMonth() + 3); 

    const businessData = {
      userId,
      businessName,
      details,
      category,
      location,
      address,
      ownerName,
      mobileNumber,
      whatsappNumber,
      businessImages: businessImageUrls,
      nationalIdImage: nationalIdUrl,
      ownerImage: ownerImageUrl,
      badge: "Trial", 
      status: "Pending",
      subscription: {
        plan: "Lite",        
        type: "Trial",      
        expiryDate: trialExpiry,
        isTrialUsed: true    
      }
    };

    const savedBusiness = await businessService.createBusiness(businessData);

    return res.status(201).json({
      success: true,
      message: "Business registered successfully",
      data: savedBusiness,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred during business registration",
      error: error.message,
    });
  }
};

// --- 2. Get All Businesses (With Pagination) ---
const getAllBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await businessService.getAllBusinesses(page, limit);

    return res.status(200).json({
      success: true,
      message: "Businesses retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve businesses",
      error: error.message,
    });
  }
};

// --- 3. Get Single Business By ID ---
const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await businessService.getBusinessById(id);

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    return res.status(200).json({ success: true, data: business });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching business details", error: error.message });
  }
};

// --- 4. Update Business ---
const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const existingBusiness = await businessService.getBusinessById(id);
    if (!existingBusiness) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Authorization Check
    if (existingBusiness.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this business" });
    }

    let updateData = { ...req.body };
    const files = req.files || {};

    // Handle Image Updates
    if (files.businessImages?.length > 0) {
      const newBusinessImages = await Promise.all(
        files.businessImages.map((file) => uploadToCloudinary(file.path))
      );
      updateData.businessImages = [...existingBusiness.businessImages, ...newBusinessImages];
    }

    if (files.nationalId?.[0]) {
      updateData.nationalIdImage = await uploadToCloudinary(files.nationalId[0].path);
    }

    if (files.ownerImage?.[0]) {
      updateData.ownerImage = await uploadToCloudinary(files.ownerImage[0].path);
    }

    const updatedBusiness = await businessService.updateBusiness(id, updateData);

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: updatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating business", error: error.message });
  }
};

// --- 5. Delete Business ---
const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const business = await businessService.getBusinessById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Authorization Check
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this business" });
    }

    await businessService.deleteBusiness(id);

    return res.status(200).json({
      success: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting business", error: error.message });
  }
};

// --- 6. Get Pending Businesses (For Admin Review) ---
const getPendingBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const businesses = await Business.find({ status: 'Pending' })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalBusinesses = await Business.countDocuments({ status: 'Pending' });

    return res.status(200).json({
      success: true,
      data: {
        businesses,
        totalBusinesses,
        totalPages: Math.ceil(totalBusinesses / limit),
        currentPage: page
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching pending businesses", error: error.message });
  }
};

// --- 7. Update Business Status (Approve/Reject) ---
const updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be 'Approved' or 'Rejected'" });
    }

    const updatedBusiness = await Business.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedBusiness) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    return res.status(200).json({ success: true, message: `Business status updated to ${status}`, data: updatedBusiness });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating business status", error: error.message });
  }
};

// --- 8. Add Service to Business ---
const addServiceToBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { serviceTitle, serviceDetails } = req.body;
    const serviceImageFile = req.file;

    const business = await businessService.getBusinessById(id);

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Security Check: Owner check and status check
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to add services to this business" });
    }

    if (business.status !== 'Approved') {
      return res.status(403).json({ success: false, message: "Business must be approved before adding services" });
    }

    const serviceImageUrl = await uploadToCloudinary(serviceImageFile?.path);

    const newService = {
      serviceTitle,
      serviceDetails,
      serviceImage: serviceImageUrl
    };

    const updatedBusiness = await businessService.addService(id, newService);

    return res.status(200).json({
      success: true,
      message: "Service added successfully",
      data: updatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding service", error: error.message });
  }
};

// --- 9. Get Business Services ---
const getBusinessServices = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id).select("services");

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    return res.status(200).json({
      success: true,
      data: business.services,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching services", error: error.message });
  }
};

// --- 10. Delete a Specific Service ---
const deleteServiceFromBusiness = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const userId = getUserId(req);

    const business = await businessService.getBusinessById(id);

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this service" });
    }

    const updatedBusiness = await businessService.deleteService(id, serviceId);

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: updatedBusiness.services,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting service", error: error.message });
  }
};

// --- 11. Update a Specific Service ---
const updateServiceInBusiness = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const userId = getUserId(req);
    const { serviceTitle, serviceDetails } = req.body;
    const serviceImageFile = req.file;

    const business = await businessService.getBusinessById(id);

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this service" });
    }

    let updateFields = {};
    if (serviceTitle) updateFields.serviceTitle = serviceTitle;
    if (serviceDetails) updateFields.serviceDetails = serviceDetails;

    if (serviceImageFile) {
      const imageUrl = await uploadToCloudinary(serviceImageFile.path);
      updateFields.serviceImage = imageUrl;
    }

    const updatedBusiness = await businessService.updateService(id, serviceId, updateFields);

    if (!updatedBusiness) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedBusiness.services.find(s => s._id.toString() === serviceId)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating service", error: error.message });
  }
};


const getMyBusinesses = async (req, res) => {
  try {
    const userId = getUserId(req); 

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await businessService.getBusinessesByUserId(userId, page, limit);

    return res.status(200).json({
      success: true,
      message: "Your businesses retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching your businesses",
      error: error.message,
    });
  }
};


// --- Update Background Image ---
const setBackgroundImage = async (req, res) => {
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
const deleteBackgroundImage = async (req, res) => {
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

// --- Add Multiple Images to a Service ---
const addServiceImages = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const userId = getUserId(req);
    const files = req.files; 

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const business = await businessService.getBusinessById(id);
    if (!business || business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized or business not found" });
    }

    // Upload all images to Cloudinary
    const imageUrls = await Promise.all(
      files.map((file) => uploadToCloudinary(file.path))
    );

    const updatedBusiness = await businessService.addImagesToService(id, serviceId, imageUrls);

    return res.status(200).json({
      success: true,
      message: "Images added to service successfully",
      data: updatedBusiness.services.id(serviceId)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding service images", error: error.message });
  }
};

// --- Remove a Single Image from Service ---
const deleteServiceImage = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const { imageUrl } = req.body;
    const userId = getUserId(req);

    const business = await businessService.getBusinessById(id);
    if (!business || business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

    await businessService.removeImageFromService(id, serviceId, imageUrl);

    return res.status(200).json({
      success: true,
      message: "Service image removed successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error removing service image", error: error.message });
  }
};



// --- Add Extra Images to Business ---
const addMoreBusinessImages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const files = req.files; // upload.array('businessImages')

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const business = await businessService.getBusinessById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Authorization Check
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

    
    const newImageUrls = await Promise.all(
      files.map((file) => uploadToCloudinary(file.path))
    );

    // Database update
    const updatedBusiness = await businessService.addImagesToBusiness(id, newImageUrls);

    return res.status(200).json({
      success: true,
      message: "Images added successfully",
      data: updatedBusiness.businessImages
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding images", error: error.message });
  }
};

// --- Remove a Specific Image from Business --- 
const deleteBusinessImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body; 
    const userId = getUserId(req);

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Image URL is required" });
    }

    const business = await businessService.getBusinessById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

   
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

   
    const updatedBusiness = await businessService.removeImageFromBusiness(id, imageUrl);

    return res.status(200).json({
      success: true,
      message: "Image removed successfully",
      data: updatedBusiness.businessImages
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error removing image", error: error.message });
  }
};

const searchBusinesses = async (req, res) => {
  try {
    const { q } = req.query; 
    
    let query = {};
    if (q) {
      query.businessName = { $regex: q, $options: "i" }; 
    }

    const businesses = await Business.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: businesses.length,
      data: businesses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Data fetch karne mein dikkat aayi",
      error: error.message,
    });
  }
};

const getMyPostedBusinesses = async (req, res) => {
  try {
    const idFromToken = req.user.userId;

    const businesses = await Business.find({ 
      userId: new mongoose.Types.ObjectId(idFromToken) 
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: businesses.length,
      data: businesses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const searchMyBusinesses = async (req, res) => {
  try {
    const idFromToken = req.user.userId;
    const { q } = req.query; 

    if (!idFromToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let filter = { userId: new mongoose.Types.ObjectId(idFromToken) };

    if (q) {
      filter.$or = [
        { businessName: { $regex: q, $options: "i" } },
        { details: { $regex: q, $options: "i" } },
        { ownerName: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { "services.serviceTitle": { $regex: q, $options: "i" } }
      ];
    }

    const results = await Business.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Search Error",
      error: error.message,
    });
  }
};

module.exports = {
  registerBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getPendingBusinesses,
  updateBusinessStatus,
  addServiceToBusiness,
  getBusinessServices,
  deleteServiceFromBusiness,
  updateServiceInBusiness,
  getMyBusinesses,
  setBackgroundImage,
  deleteBackgroundImage,
  addServiceImages,
  deleteServiceImage,
  addMoreBusinessImages ,
  deleteBusinessImage ,
  searchBusinesses,
  getMyPostedBusinesses,
  searchMyBusinesses
};