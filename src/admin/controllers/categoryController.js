const Category = require('../../admin/models/Category');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs'); 

exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Image upload Must" });
        }

        // Cloudinary upload
        const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
            folder: "category_icons",
        });

        const newCategory = new Category({
            name: name,
            image: uploadResponse.secure_url,
            createdBy: req.user.id
        });

        await newCategory.save();

        
        const populatedCategory = await Category.findById(newCategory._id)
            .populate('createdBy', 'email role'); 

        fs.unlinkSync(req.file.path); 

        res.status(201).json({ 
            message: "Category created successfully", 
            data: populatedCategory 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.toggleCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Category find karein
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        
        category.status = !category.status;

        await category.save();

        res.status(200).json({
            message: `Category status updated to ${category.status ? 'Active' : 'Deactive'}`,
            data: category
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Update Category API
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

       
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

       
        if (name) {
            category.name = name;
        }

        
        if (req.file) {
           

            const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
                folder: "category_icons",
            });

            category.image = uploadResponse.secure_url;

           
            fs.unlinkSync(req.file.path);
        }

        await category.save();

      
        const populatedCategory = await Category.findById(category._id)
            .populate('createdBy', 'email role');

        res.status(200).json({
            message: "Category updated successfully",
            data: populatedCategory
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
