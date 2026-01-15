const fs = require("fs");
const businessService = require("../services/business.services");
const cloudinary = require("../config/cloudinary");
const Business = require("../models/Business"); 

// --- Helper Function: Upload to Cloudinary ---
const uploadToCloudinary = async (filePath) => {
  if (!filePath) return null;
  try {
    const { secure_url } = await cloudinary.uploader.upload(filePath, {
      folder: "business_directory",
    });
    // Upload hone ke baad server se file delete karein
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return secure_url;
  } catch (err) {
    // Error aane par bhi file delete karein
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw err;
  }
};

// --- 1. Register Business ---
const registerBusiness = async (req, res) => {
  try {
    // User ID nikalna (Token se)
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication failed" });
    }

    const { businessName, details, category, location, address, ownerName, mobileNumber, whatsappNumber } = req.body;
    
    // Files check karna
    const { businessImages, nationalId, ownerImage } = req.files || {};

    if (!businessImages || !nationalId || !ownerImage) {
      return res.status(400).json({ success: false, message: "Please upload all required images (Business, ID, Owner)" });
    }

    // Images Cloudinary par upload karna
    const businessImageUrls = await Promise.all(
      businessImages.map((file) => uploadToCloudinary(file.path))
    );
    const nationalIdUrl = await uploadToCloudinary(nationalId[0].path);
    const ownerImageUrl = await uploadToCloudinary(ownerImage[0].path);

    // Data prepare karna
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
    };

    // Database me save karna
    const savedBusiness = await businessService.createBusiness(businessData);

    return res.status(201).json({
      success: true,
      message: "Business registered successfully",
      data: savedBusiness,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong in registration",
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
      count: result.businesses.length, 
      totalRecords: result.totalBusinesses, 
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      data: result.businesses,
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Error fetching businesses", 
      error: error.message 
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
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    const existingBusiness = await businessService.getBusinessById(id);
    if (!existingBusiness) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    console.log(`Update Request - Owner ID: ${existingBusiness.userId}, LoggedIn User: ${userId}`);

    
    if (existingBusiness.userId.toString() !== userId.toString()) {
       return res.status(403).json({ success: false, message: "You are not authorized to update this business" });
    }

    let updateData = { ...req.body };
    const files = req.files || {};

    
    if (files.businessImages && files.businessImages.length > 0) {
      const newBusinessImages = await Promise.all(
        files.businessImages.map((file) => uploadToCloudinary(file.path))
      );
      updateData.businessImages = [...existingBusiness.businessImages, ...newBusinessImages];
    }

    
    if (files.nationalId && files.nationalId[0]) {
      updateData.nationalIdImage = await uploadToCloudinary(files.nationalId[0].path);
    }

    
    if (files.ownerImage && files.ownerImage[0]) {
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
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    const business = await businessService.getBusinessById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    console.log(`Delete Request - Owner ID: ${business.userId}, LoggedIn User: ${userId}`);


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

module.exports = {
  registerBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness
};