const SubcategoryData = require("../../admin/models/SubCategoryData");
const Category = require("../../admin/models/Category");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");

const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map(file =>
        cloudinary.uploader.upload(file.path, { folder: "jobs" })
    );
    const results = await Promise.all(uploadPromises);


    files.forEach(file => fs.unlinkSync(file.path));

    return results.map(result => result.secure_url);
};


exports.createSubcategoryData = async (req, res) => {
    try {
        const adminId = req.user?._id || req.user?.id;
        if (!adminId) {
            return res.status(401).json({ success: false, message: "Admin authentication failed." });
        }
        
        const { 
            categoryName, 
            subCategoryName, 
            title,           
            description,     
            address,        
            rating,        
            reviewCount,    
            isTrusted,       
            isCertified,     
            calls, chats, whatsapp, saved, profileOpens, impressions, 
            services         
        } = req.body;

        const foundCategory = await Category.findOne({ category: categoryName });
        if (!foundCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        let finalImageUrls = [];
        if (req.files && req.files.length > 0) {
            finalImageUrls = await uploadFilesToCloudinary(req.files);
        }

        const newData = new SubcategoryData({
            categoryId: foundCategory._id,
            subCategoryName: subCategoryName,
            title: title,
            description: description,
            address: address,
            rating: Number(rating) || 0,
            reviewCount: Number(reviewCount) || 0,
            
            isTrusted: isTrusted === 'true' || isTrusted === true,
            isCertified: isCertified === 'true' || isCertified === true,

            analytics: {
                calls: Number(calls) || 0,
                chats: Number(chats) || 0,
                whatsapp: Number(whatsapp) || 0,
                saved: Number(saved) || 0,
                profileOpens: profileOpens || "0",
                impressions: impressions || "0"
            },

            images: finalImageUrls, 
            services: services ? JSON.parse(services) : [],

            createdBy: adminId 
        });
        const savedData = await newData.save();
        
        res.status(201).json({ 
            success: true, 
            message: "Sara data save ho gaya hai!", 
            data: savedData 
        });

    } catch (error) {
        console.error("Error saving data:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBySubCategory = async (req, res) => {
    try {
      
        const { categoryName, subCategoryName } = req.query;

       
        if (!categoryName || !subCategoryName) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide both categoryName and subCategoryName in query parameters." 
            });
        }

        const foundCategory = await Category.findOne({ category: categoryName });

        if (!foundCategory) {
            return res.status(404).json({
                success: false,
                message: `Category '${categoryName}' not found.`
            });
        }

        const results = await SubcategoryData.find({
            categoryId: foundCategory._id, 
            subCategoryName: subCategoryName, 
            status: true
        })
        .populate('categoryId', 'category type') 
        .populate('createdBy', 'name email');   

        res.status(200).json({
            success: true,
            count: results.length,
            categoryName: categoryName,
            subCategoryName: subCategoryName,
            data: results
        });

    } catch (error) {
        console.error("Error in getBySubCategory:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDetailById = async (req, res) => {
    try {
        const detail = await SubcategoryData.findById(req.params.id);

        if (!detail) {
            return res.status(404).json({ 
                success: false, 
                message: "Record not found with this ID" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: detail 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryName } = req.query;

    // 1. Category find karein
    const categoryDoc = await Category.findOne({ category: categoryName });

    if (!categoryDoc) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // 2. Subcategories ko sort karein (Newest first)
    const sortedSubCategories = categoryDoc.subCategory.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // 3. Response bhejein (Bina pagination ke)
    res.status(200).json({
      success: true,
      count: sortedSubCategories.length, // Total items count dikhane ke liye (optional)
      data: sortedSubCategories
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateSubcategoryData = async (req, res) => {
    try {

        const body = req.body;

        let updateData = { ...body };

        // Upload new images if provided
        if (req.files && req.files.length > 0) {
            updateData.images = await uploadFilesToCloudinary(req.files);
        }

        // Convert boolean fields
        if (body.isTrusted !== undefined) {
            updateData.isTrusted =
                body.isTrusted === "true" || body.isTrusted === true;
        }

        if (body.isCertified !== undefined) {
            updateData.isCertified =
                body.isCertified === "true" || body.isCertified === true;
        }

        // Services parse
        if (body.services) {
            updateData.services =
                typeof body.services === "string"
                    ? JSON.parse(body.services)
                    : body.services;
        }

        // Analytics update
        updateData.analytics = {
            calls: Number(body.calls) || 0,
            chats: Number(body.chats) || 0,
            whatsapp: Number(body.whatsapp) || 0,
            saved: Number(body.saved) || 0,
            profileOpens: body.profileOpens || "0",
            impressions: body.impressions || "0"
        };

        // Rating & reviews
        updateData.rating = Number(body.rating) || 0;
        updateData.reviewCount = Number(body.reviewCount) || 0;

        const updatedData = await SubcategoryData.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedData) {
            return res.status(404).json({
                success: false,
                message: "Data not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Subcategory data updated successfully",
            data: updatedData
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

exports.deleteSubcategoryData = async (req, res) => {
    try {

        const deletedData = await SubcategoryData.findByIdAndDelete(
            req.params.id
        );

        if (!deletedData) {
            return res.status(404).json({
                success: false,
                message: "Data not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Subcategory data deleted successfully",
            data: deletedData
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};