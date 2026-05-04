const SubcategoryData = require("../../admin/models/SubCategoryData");
const Category = require("../../admin/models/Category");

exports.createSubcategoryData = async (req, res) => {
    try {
        console.log("User data from req.user:", req.user);
        const adminId = req.user?._id || req.user?.id;

        if (!adminId) {
            return res.status(401).json({ 
                success: false, 
                message: "Admin authentication failed. User ID not found in token payload.",
                decodedDataReceived: req.user 
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

        let liveImageUrl = "";
        if (req.file) {
            liveImageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

      
        const newData = new SubcategoryData({
            ...req.body,
            image: liveImageUrl,
            subCategoryName: subCategoryName,
            categoryId: foundCategory._id,
            createdBy: adminId 
        });

        const savedData = await newData.save();
        res.status(201).json({ success: true, data: savedData });

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