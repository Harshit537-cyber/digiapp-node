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
        console.log("User data from req.user:", req.user);
        const adminId = req.user?._id || req.user?.id;

        if (!adminId) {
            return res.status(401).json({ 
                success: false, 
                message: "Admin authentication failed." 
            });
        }

        const { categoryName, subCategoryName } = req.query;

        if (!categoryName || !subCategoryName) {
            return res.status(400).json({ success: false, message: "categoryName and subCategoryName are required." });
        }

        const foundCategory = await Category.findOne({ category: categoryName });
        if (!foundCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // --- CLOUDINARY UPLOAD LOGIC ---
        let finalImageUrl = "";

        if (req.file) {
            // Aapka function array mangta hai, isliye humne [req.file] pass kiya
            const uploadResults = await uploadFilesToCloudinary([req.file]);
            
            // Function array return karta hai, toh pehla URL nikal lenge
            if (uploadResults && uploadResults.length > 0) {
                finalImageUrl = uploadResults[0];
            }
        } 
        // Fallback: Agar kisi wajah se cloudinary function use nahi karna aur local path chahiye (optional)
        else if (req.body.image) {
            finalImageUrl = req.body.image;
        }

        const newData = new SubcategoryData({
            ...req.body,


             images: finalImageUrl ? [finalImageUrl] : [], // Yahan Cloudinary ka secure_url save hoga
            subCategoryName: subCategoryName,
            categoryId: foundCategory._id,
            createdBy: adminId 
        });

        const savedData = await newData.save();
        
        // Response mein wahi URL jayega jo generate hua hai
        res.status(201).json({ 
            success: true, 
            data: savedData,
        });

    } catch (error) {
        console.error("Controller Error:", error);
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