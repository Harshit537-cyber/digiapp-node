const BusinessCategory = require('../models/BusinessCategory');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

exports.createCategory = async (req, res) => {
  try {
    const { name, type, category, subCategory } = req.body;

    if (!name || !type) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Name and type are required"
      });
    }

    const allowedTypes = ["Business"];
    if (!allowedTypes.includes(type)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Type must be Business"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image upload is required"
      });
    }

    const exists = await BusinessCategory.findOne({ name, type });
    if (exists) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: 'category_icons'
    });

    const newCategory = await BusinessCategory.create({
      name,
      type,
      category: category || "", 
      subCategory: subCategory ? (Array.isArray(subCategory) ? subCategory : [subCategory]) : [], 
      image: uploadResponse.secure_url,
      createdBy: req.user?.id 
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: "Business Category created successfully",
      data: newCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Create Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.searchBusinessCategories = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const searchFilter = {
      status: true, 
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { subCategory: { $regex: q, $options: 'i' } }
      ]
    };

    const results = await BusinessCategory.find(searchFilter)
      .select('name image subCategory type') 
      .limit(10); 

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Search Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await BusinessCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Business Category not found"
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error("Get Category By ID Error:", error.message);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Category ID format" 
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllCategories = async (req, res) => {
  try {
    const categories = await BusinessCategory.find({})
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateBusinessCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { name, status } = req.body;

    let categoryDoc = await BusinessCategory.findById(id);
    if (!categoryDoc) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (req.file) {
      if (categoryDoc.image) {
        try {
          const publicId = categoryDoc.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`category_icons/${publicId}`);
        } catch (err) {
          console.error("Cloudinary delete error:", err.message);
        }
      }

      const uploadResponse = await cloudinary.uploader.upload(req.file.path, { 
        folder: 'category_icons' 
      });
      categoryDoc.image = uploadResponse.secure_url;
      
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    if (name) {
      categoryDoc.name = name;
    }

    if (status !== undefined) {
      categoryDoc.status = String(status) === 'true';
    }

    const updatedCategory = await categoryDoc.save();

    res.status(200).json({
      success: true,
      message: "Business Category updated (Name, Image, and Status only)",
      data: updatedCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("Update Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await BusinessCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    if (category.image) {
      try {
        const publicId = category.image.split('/').pop().split('.')[0];
        const folderName = 'category_icons'; 
        
        await cloudinary.uploader.destroy(`${folderName}/${publicId}`);
      } catch (cloudinaryErr) {
        console.error("Cloudinary Delete Error:", cloudinaryErr.message);
      }
    }
    await BusinessCategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Category and associated image deleted successfully"
    });

  } catch (error) {
    console.error("Delete Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// sub categories

exports.createSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategory } = req.body;

    if (!categoryId || !subCategory) {
      return res.status(400).json({ 
        success: false, 
        message: "CategoryId and subCategory name are required" 
      });
    }
    const updatedDoc = await BusinessCategory.findByIdAndUpdate(
      categoryId, 
      { 
        $addToSet: { subCategory: subCategory } 
      },
      { new: true } 
    );

    if (!updatedDoc) {
      return res.status(404).json({ 
        success: false, 
        message: "Main Category not found with this ID" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub-category added successfully",
      data: updatedDoc
    });

  } catch (error) {
    console.error("Sub-category Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateBusinessSubCategory = async (req, res) => {
  try {
    const { categoryId, oldSubCategory, newSubCategory } = req.body;

    if (!categoryId || !oldSubCategory || !newSubCategory) {
      return res.status(400).json({
        success: false,
        message: "categoryId, oldSubCategory, and newSubCategory are required"
      });
    }

    const updatedDoc = await BusinessCategory.findOneAndUpdate(
      { _id: categoryId, subCategory: oldSubCategory }, 
      { 
        $set: { "subCategory.$": newSubCategory.trim() } 
      },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Category not found or Sub-category name mismatch"
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub-category updated successfully",
      data: updatedDoc
    });

  } catch (error) {
    console.error("Update Sub-category Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.getSubCategoriesByCategoryId = async (req, res) => {
  try {
    const { id } = req.params; 
    const categoryData = await BusinessCategory.findById(id).select('name subCategory');

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "Business Category not found"
      });
    }

    res.status(200).json({
      success: true,
      categoryName: categoryData.name, 
      subCategories: categoryData.subCategory
    });

  } catch (error) {
    console.error("Get Sub-categories Error:", error.message);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Category ID format" 
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.deleteBusinessSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryName } = req.body;

    if (!categoryId || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subCategoryName are required"
      });
    }

    const updatedDoc = await BusinessCategory.findByIdAndUpdate(
      categoryId,
      { 
        $pull: { subCategory: subCategoryName } 
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
      message: `Sub-category '${subCategoryName}' deleted successfully`,
      data: updatedDoc
    });

  } catch (error) {
    console.error("Delete Sub-category Error:", error.message);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getBusinessSingleSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryName } = req.query;

    if (!categoryId || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subCategoryName are required in query"
      });
    }
    const category = await BusinessCategory.findOne(
      { 
        _id: categoryId, 
        subCategory: { $regex: new RegExp(`^${subCategoryName.trim()}$`, 'i') } 
      },
      { "subCategory.$": 1, name: 1 } 
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found in this category"
      });
    }

    res.status(200).json({
      success: true,
      categoryName: category.name,
      subCategory: category.subCategory[0] 
    });

  } catch (error) {
    console.error("Get Single Sub-Category Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.searchSubCategoriesBusiness = async (req, res) => {
  try {
    const { query } = req.query; 

    if (!query) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const categories = await BusinessCategory.find({
      subCategory: { $regex: query, $options: "i" } 
    }).select("name subCategory");

    const results = categories.map(cat => ({
      categoryId: cat._id,
      categoryName: cat.name,
      matchedSubCategories: cat.subCategory.filter(sub => 
        sub.toLowerCase().includes(query.toLowerCase())
      )
    }));

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// exports.updateSubCategory = async (req, res) => {
//   try {
//     const { category, oldSubCategory, newSubCategory } = req.body;

//     if (!category || !oldSubCategory || !newSubCategory) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Main category, old sub-category, and new sub-category name are required" 
//       });
//     }

   
//     const updatedDoc = await Category.findOneAndUpdate(
//       { 
//         category: category, 
//         subCategory: oldSubCategory 
//       },
//       { 
//         $set: { 
//           "subCategory.$": newSubCategory, 
//           updatedBy: req.user?.id 
//         } 
//       },
//       { new: true } 
//     );

   
//     if (!updatedDoc) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Main Category or specific Sub-category not found" 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Sub-category updated successfully",
//       data: updatedDoc
//     });

//   } catch (error) {
//     console.error("Update Error:", error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };



// exports.deleteSubCategory = async (req, res) => {
//   try {
//     const { category, subCategoryToDelete } = req.body;
//     if (!category || !subCategoryToDelete) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Main category and sub-category to delete are required" 
//       });
//     }

//     const updatedDoc = await BusinessCategory.findOneAndUpdate(
//       { category: category }, 
//       { 
//         $pull: { subCategory: subCategoryToDelete } 
//       },
//       { new: true }
//     );

//     if (!updatedDoc) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Main Category not found" 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Sub-category deleted successfully",
//       data: updatedDoc
//     });

//   } catch (error) {
//     console.error("Delete Error:", error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };





// getAllCategoriesForDropdown
// exports.getAllCategoriesForDropdown = async (req, res) => {
//   try {
//     const categories = await Category.distinct('category');
    
//     // Optional: Filter out empty strings if any exist
//     const filteredCategories = categories.filter(cat => cat.trim() !== "");

//     res.status(200).json({
//       success: true,
//       data: filteredCategories
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getSubcategoriesBySection = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;


//     const { categoryName } = req.query;

//     const categoryDoc = await Category.findOne({ category: categoryName });


//     if (!categoryDoc) {
//       return res.status(404).json({ success: false, message: "Category not found" });
//     }

//  const sortedSubCategories = categoryDoc.subCategory.sort((a, b) => {
//       return new Date(b.createdAt) - new Date(a.createdAt); 
//     });
//     const totalItems = sortedSubCategories.length;
//     const paginatedData = sortedSubCategories.slice(skip, skip + limit);

//     res.status(200).json({
//       success: true,
//        pagination: {
//         totalItems,
//         totalPages: Math.ceil(totalItems / limit),
//         currentPage: page,
//         limit
//       },
//       data: paginatedData
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };





// exports.searchCategory = async (req, res) => {
//   try {
//     const { q } = req.query; 

//     if (!q) {
//       return res.status(400).json({
//         success: false,
//         message: "Search query is required"
//       });
//     }

//     const results = await Category.find({
//       name: { $regex: q, $options: 'i' }
//     }).populate('createdBy', 'name email'); 

//     res.status(200).json({
//       success: true,
//       count: results.length,
//       data: results
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error performing search",
//       error: error.message
//     });
//   }
// };