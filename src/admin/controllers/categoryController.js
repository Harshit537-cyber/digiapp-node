// const Category = require('../../admin/models/Category');
// const cloudinary = require('../../config/cloudinary');
// const fs = require('fs'); 

// exports.createCategory = async (req, res) => {
//     try {
//         const { name } = req.body;

//         if (!req.file) {
//             return res.status(400).json({ message: "Image upload karna zaroori hai" });
//         }

//         // Cloudinary upload
//         const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
//             folder: "category_icons",
//         });

//         // Nayi category banate waqt admin ki ID pass karein
//         const newCategory = new Category({
//             name: name,
//             image: uploadResponse.secure_url,
//             createdBy: req.user.id // Ye req.user middleware se aa raha hai
//         });

//         await newCategory.save();

//         // Admin ki details response mein dikhane ke liye populate karein
//         const populatedCategory = await Category.findById(newCategory._id)
//             .populate('createdBy', 'email role'); // Admin ka email aur role dikhayega

//         fs.unlinkSync(req.file.path); 

//         res.status(201).json({ 
//             message: "Category created successfully", 
//             data: populatedCategory 
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// };


// exports.getAllCategories = async (req, res) => {
//     try {
//         const categories = await Category.find();
//         res.status(200).json(categories);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


// exports.deleteCategory = async (req, res) => {
//     try {
//         await Category.findByIdAndDelete(req.params.id);
//         res.status(200).json({ message: "Category deleted" });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }

// };


const Category = require('../../admin/models/Category');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

exports.createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

 
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and type are required"
      });
    }

   
    const allowedTypes = ['jobs', 'sale', 'shop'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be jobs, sale or shop"
      });
    }

    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image upload is required"
      });
    }

   
    const exists = await Category.findOne({ name, type });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    
    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: 'category_icons'
    });

    
    const category = await Category.create({
      name,
      type,
      image: uploadResponse.secure_url,
      createdBy: req.user?.id // safe access
    });

    
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });

  } catch (error) {
    console.error("Create Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllCategories = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = type ? { type } : {};

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error("Get Categories Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });

  } catch (error) {
    console.error("Delete Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    
    let category = await Category.findById(id);
    if (!category) {
    
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

   
    if (type) {
      const allowedTypes = ['jobs', 'sale', 'shop'];
      if (!allowedTypes.includes(type)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: "Type must be jobs, sale or shop"
        });
      }
    }

    // 3. Check for duplicate name/type (excluding current category)
    if (name || type) {
      const checkName = name || category.name;
      const checkType = type || category.type;
      const exists = await Category.findOne({ 
        name: checkName, 
        type: checkType, 
        _id: { $ne: id } 
      });
      
      if (exists) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: "Another category with this name and type already exists"
        });
      }
    }

    // 4. Handle Image Update (If new image is uploaded)
    if (req.file) {
      // Upload new image to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: 'category_icons'
      });

      // Purani image ka URL update karein
      category.image = uploadResponse.secure_url;

      // Local temporary file delete karein
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      
    }

    // 5. Update other fields
    category.name = name || category.name;
    category.type = type || category.type;

    // Save updated category
    const updatedCategory = await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory
    });

  } catch (error) {
    // Error aane par agar koi file upload hui thi to delete karein
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Update Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};