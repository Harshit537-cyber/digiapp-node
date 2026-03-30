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
    const { name, type, category } = req.body;

 
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

    
    const newCategory = await Category.create({
      name,
      type,
      category,
      image: uploadResponse.secure_url,
      createdBy: req.user?.id // safe access
    });

    
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory
    });

  } catch (error) {
    console.error("Create Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.createSubCategory = async (req, res) => {
  try {
    const { category, subCategory } = req.body;

    // 1. Parent category dhoondhein uska 'type' lene ke liye
    const mainCategory = await Category.findOne({ category: category });
    if (!mainCategory) {
      return res.status(404).json({ success: false, message: "Main Category not found" });
    }

    // 2. Find and Update logic
    // Hum wo document dhoondhenge jisme 'category' field parent ke naam ke barabar ho
    const updatedDoc = await Category.findOneAndUpdate(
      { category: category }, // Filter
      { 
        $set: { 
          name: category, 
          type: mainCategory.type, 
          createdBy: req.user?.id 
        },
        $push: { subCategory: subCategory } // Array mein Naya item add karega
      },
      { new: true, upsert: true } // Agar document nahi hai toh naya bana dega
    );

    res.status(201).json({
      success: true,
      message: "Sub-category added successfully",
      data: updatedDoc
    });

  } catch (error) {
    console.error("Error logic:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateSubCategory = async (req, res) => {
  try {
    const { category, oldSubCategory, newSubCategory } = req.body;

    if (!category || !oldSubCategory || !newSubCategory) {
      return res.status(400).json({ 
        success: false, 
        message: "Main category, old sub-category, and new sub-category name are required" 
      });
    }

   
    const updatedDoc = await Category.findOneAndUpdate(
      { 
        category: category, 
        subCategory: oldSubCategory 
      },
      { 
        $set: { 
          "subCategory.$": newSubCategory, 
          updatedBy: req.user?.id 
        } 
      },
      { new: true } 
    );

   
    if (!updatedDoc) {
      return res.status(404).json({ 
        success: false, 
        message: "Main Category or specific Sub-category not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub-category updated successfully",
      data: updatedDoc
    });

  } catch (error) {
    console.error("Update Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.deleteSubCategory = async (req, res) => {
  try {
    const { category, subCategoryToDelete } = req.body;
    if (!category || !subCategoryToDelete) {
      return res.status(400).json({ 
        success: false, 
        message: "Main category and sub-category to delete are required" 
      });
    }


    const updatedDoc = await Category.findOneAndUpdate(
      { category: category }, 
      { 
        $pull: { subCategory: subCategoryToDelete } 
      },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ 
        success: false, 
        message: "Main Category not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub-category deleted successfully",
      data: updatedDoc
    });

  } catch (error) {
    console.error("Delete Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.distinct("category", { category: { $ne: "" } });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubcategoriesBySection = async (req, res) => {
  try {
    const { categoryName } = req.query;

    // Find the document where the name matches
    const categoryDoc = await Category.findOne({ name: categoryName });

    // If category exists, send the subCategory array, otherwise send empty array
    res.status(200).json({
      success: true,
      data: categoryDoc ? categoryDoc.subCategory : []
    });

  } catch (error) {
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
    
    // 1. Destructure fields
    const { name, type, category: categoryField } = req.body;
    
    // Debugging ke liye (categoryField check karein)
    console.log("Input Data:", { name, type, categoryField });

    // 2. Find Category
    let categoryDoc = await Category.findById(id); // Naam categoryDoc rakha taaki confusion na ho
    if (!categoryDoc) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // 3. Validation
    if (type) {
      const allowedTypes = ['jobs', 'sale', 'shop'];
      if (!allowedTypes.includes(type)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: "Type must be jobs, sale or shop" });
      }
    }

    // 4. Duplicate Check
    if (name || type) {
      const checkName = name || categoryDoc.name;
      const checkType = type || categoryDoc.type;
      const exists = await Category.findOne({ 
        name: checkName, 
        type: checkType, 
        _id: { $ne: id } 
      });
      if (exists) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: "Duplicate exists" });
      }
    }

    // 5. Image Update
    if (req.file) {
      const uploadResponse = await cloudinary.uploader.upload(req.file.path, { folder: 'category_icons' });
      categoryDoc.image = uploadResponse.secure_url;
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    // 6. Final Updates
    categoryDoc.name = name || categoryDoc.name;
    categoryDoc.type = type || categoryDoc.type;
    
    if (categoryField !== undefined) {
      categoryDoc.category = categoryField;
    }

    const updatedCategory = await categoryDoc.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};