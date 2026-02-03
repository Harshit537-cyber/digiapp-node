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
const getAllBusinesses = async (req, res) => { // <<<--- FIX 1: Add (req, res)
  try {
    // FIX 2: Get page and limit from the request query string
    // Provide default values (e.g., page 1, limit 10) if they are not sent
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // FIX 3: Call the service function to get the data
    const result = await businessService.getAllBusinesses(page, limit);

    // FIX 4: Send a JSON response back to the client (Postman)
    return res.status(200).json({
      success: true,
      message: "Businesses retrieved successfully",
      data: result,
    });

  } catch (error) {
    // FIX 5: Send an error response if something goes wrong
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


const addServiceToBusiness = async (req, res) => {
  try {
    const { id } = req.params; // Business ki ID
    const userId = req.user?.userId; // Logged-in user ki ID
    const { serviceTitle, serviceDetails } = req.body;
    const serviceImageFile = req.file; // Service ki image file

    const business = await businessService.getBusinessById(id);

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Check karein ki user business ka malik hai aur business approved hai
    if (business.userId.toString() !== userId.toString()) {
       return res.status(403).json({ success: false, message: "Aap is business mein service add nahi kar sakte" });
    }
    
    if (business.status !== 'Approved') {
       return res.status(403).json({ success: false, message: "Service add karne ke liye business ka Approved hona zaroori hai" });
    }

    // Image ko Cloudinary par upload karein
    const serviceImageUrl = await uploadToCloudinary(serviceImageFile.path);

    const newService = {
        serviceTitle,
        serviceDetails,
        serviceImage: serviceImageUrl
    };

    // Service ko database mein save karein
    const updatedBusiness = await businessService.addService(id, newService);

    return res.status(200).json({
      success: true,
      message: "Service successfully add ho gayi",
      data: updatedBusiness,
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Service add karne mein error aaya", error: error.message });
  }
};


module.exports = {
  registerBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  updateBusinessStatus,
  addServiceToBusiness
};