const Category = require('../../admin/models/Category');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs'); 

exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Image upload karna zaroori hai" });
        }

        // Cloudinary upload
        const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
            folder: "category_icons",
        });

        // Nayi category banate waqt admin ki ID pass karein
        const newCategory = new Category({
            name: name,
            image: uploadResponse.secure_url,
            createdBy: req.user.id // Ye req.user middleware se aa raha hai
        });

        await newCategory.save();

        // Admin ki details response mein dikhane ke liye populate karein
        const populatedCategory = await Category.findById(newCategory._id)
            .populate('createdBy', 'email role'); // Admin ka email aur role dikhayega

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