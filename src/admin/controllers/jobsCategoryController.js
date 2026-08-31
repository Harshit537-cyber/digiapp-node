const JobsCategory = require('../models/JobsCategory'); 
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

exports.createJobsCategory = async (req, res) => {
  try {
    const { name, type, subCategory } = req.body;

    if (!name || !type) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Name and job type are required"
      });
    }

    const allowedJobTypes = ["LOCAL_JOB", "PART_TIME_JOB", "FULL_TIME_JOB"];
    if (!allowedJobTypes.includes(type)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Type must be LOCAL_JOB, PART_TIME_JOB, or FULL_TIME_JOB"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Category image is required"
      });
    }

    const exists = await JobsCategory.findOne({ name, type });
    if (exists) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "This category already exists for this job type"
      });
    }

    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: 'jobs_category_icons' 
    });

    const newJobCategory = await JobsCategory.create({
      name,
      type,
      image: uploadResponse.secure_url,
      subCategory: subCategory ? (Array.isArray(subCategory) ? subCategory : [subCategory]) : [],
      createdBy: req.user?.id 
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: "Jobs Category created successfully",
      data: newJobCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Create Jobs Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateJobsCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, type } = req.body;

    let category = await JobsCategory.findById(id);
    if (!category) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Jobs Category not found"
      });
    }

    if (type) {
      const allowedJobTypes = ["LOCAL_JOB", "PART_TIME_JOB", "FULL_TIME_JOB"];
      if (!allowedJobTypes.includes(type)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: "Invalid Type. Must be LOCAL_JOB, PART_TIME_JOB, or FULL_TIME_JOB"
        });
      }
      category.type = type; 
    }

    if (req.file) {
      if (category.image) {
        try {
          const publicId = category.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`jobs_category_icons/${publicId}`);
        } catch (err) {
          console.error("Cloudinary Delete Error:", err.message);
        }
      }

      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: 'jobs_category_icons'
      });
      category.image = uploadResponse.secure_url; // Image update kiya

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    if (name) {
      category.name = name;
    }
                            
    if (status !== undefined) {
      category.status = String(status) === 'true';
    }

    const updatedCategory = await category.save();

    res.status(200).json({
      success: true,
      message: "Jobs Category updated successfully (Name, Image, Status, Type)",
      data: updatedCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Update Jobs Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteJobsCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await JobsCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Jobs Category not found"
      });
    }

    if (category.image) {
      try {
        
        const publicId = category.image.split('/').pop().split('.')[0];
        
        await cloudinary.uploader.destroy(`jobs_category_icons/${publicId}`);
      } catch (cloudinaryErr) {
        console.error("Cloudinary Image Delete Error:", cloudinaryErr.message);
      }
    }

    await JobsCategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Jobs Category and its icon deleted successfully"
    });

  } catch (error) {
    console.error("Delete Jobs Category Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getAllJobsCategories = async (req, res) => {
  try {
    const { type } = req.query;

    let query = {}; 

    if (type) {
      query.type = type;
    }

    const categories = await JobsCategory.find(query)
      .sort({ name: 1 }); 

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error("Get All Jobs Categories Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



exports.deleteJobsCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await JobsCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Jobs Category not found"
      });
    }
    if (category.image) {
      try {
        const publicId = category.image.split('/').pop().split('.')[0];
        const folderName = 'jobs_category_icons'; 
        
        await cloudinary.uploader.destroy(`${folderName}/${publicId}`);
      } catch (cloudinaryErr) {
        console.error("Cloudinary Image Delete Error:", cloudinaryErr.message);
      }
    }
    await JobsCategory.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Jobs Category and its icon deleted successfully"
    });

  } catch (error) {
    console.error("Delete Jobs Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getJobsCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await JobsCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Jobs Category not found"
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });

  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateJobsCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, subCategory, status } = req.body;

    let category = await JobsCategory.findById(id);
    if (!category) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    let imageUrl = category.image;
    if (req.file) {
      if (category.image) {
        const oldPublicId = category.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`jobs_category_icons/${oldPublicId}`);
      }

      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: 'jobs_category_icons'
      });
      imageUrl = uploadResponse.secure_url;

      fs.unlinkSync(req.file.path);
    }

    const updatedData = {
      name: name || category.name,
      type: type || category.type,
      status: status !== undefined ? status : category.status,
      image: imageUrl,
         subCategory: subCategory ? (Array.isArray(subCategory) ? subCategory : [subCategory]) : category.subCategory
    };

    const updatedCategory = await JobsCategory.findByIdAndUpdate(id, updatedData, { new: true });

    res.status(200).json({
      success: true,
      message: "Jobs Category updated successfully",
      data: updatedCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("Update Jobs Category Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchJobsCategories = async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query (q) is required"
      });
    }
    let searchFilter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { subCategory: { $regex: q, $options: 'i' } }
      ]
    };

    if (type) {
      searchFilter.type = type;
    }
    const results = await JobsCategory.find(searchFilter)
      .sort({ name: 1 }); 

    res.status(200).json({
      success: true,
      count: results.length, 
      data: results
    });

  } catch (error) {
    console.error("Search Jobs Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

// sub category 

exports.createJobsSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryName } = req.body;

    if (!categoryId || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subCategoryName are required"
      });
    }

    const updatedCategory = await JobsCategory.findByIdAndUpdate(
      categoryId,
      { 
        $addToSet: { subCategory: subCategoryName.trim() } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Jobs Category not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Sub-category '${subCategoryName}' added successfully to ${updatedCategory.name}`,
      data: updatedCategory
    });

  } catch (error) {
    console.error("Create Jobs Sub-Category Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.getSingleSubCategoryById = async (req, res) => {
  try {
    const { type, categoryId, subCategoryName } = req.query; 

    if (!type || !categoryId || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type, categoryId, and subCategoryName are needed in query"
      });
    }

    const category = await JobsCategory.findOne(
      { 
        _id: categoryId, 
        type: type, 
        subCategory: { $regex: new RegExp(`^${subCategoryName.trim()}$`, 'i') }
      },
      { "subCategory.$": 1, name: 1, type: 1 } 
    );

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: "Sub-category not found. Please check Type, Category ID, and Name." 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        categoryName: category.name,
        type: category.type,
        subCategory: category.subCategory[0] 
      }
    });

  } catch (error) {
    console.error("Get Single Sub-Category Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }
    
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllSubCategoriesByCategory = async (req, res) => {
  try {
    const { type, categoryId } = req.params;

    const categoryData = await JobsCategory.findOne({
      _id: categoryId,
      type: type
    }).select("subCategory name type");

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "Jobs Category not found with the specified Type and ID"
      });
    }

    res.status(200).json({
      success: true,
      categoryName: categoryData.name,
      jobType: categoryData.type,
      totalSubCategories: categoryData.subCategory.length,
      data: categoryData.subCategory 
    });

  } catch (error) {
    console.error("Get All Sub-Categories Error:", error.message);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



exports.deleteSubCategory = async (req, res) => {
  try {
    const { categoryId, type, subCategoryName } = req.body;

    if (!categoryId || !type || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryId, type, and subCategoryName are required"
      });
    }

    const category = await JobsCategory.findOne({ _id: categoryId, type: type });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found with this Type and ID"
      });
    }

    const originalLength = category.subCategory.length;
    category.subCategory = category.subCategory.filter(
      (item) => item.toLowerCase() !== subCategoryName.trim().toLowerCase()
    );

    if (category.subCategory.length === originalLength) {
      return res.status(404).json({
        success: false,
        message: `Sub-category '${subCategoryName}' not found in this category`
      });
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: `Sub-category '${subCategoryName}' deleted successfully`,
      data: category
    });

  } catch (error) {
    console.error("Delete Sub-Category Error:", error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.updateSubCategory =async (req, res) => {
  try {
    const { categoryId, type, oldSubCategoryName, newSubCategoryName } = req.body;

    if (!categoryId || !type || !oldSubCategoryName || !newSubCategoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryId, type, oldSubCategoryName, and newSubCategoryName are required"
      });
    }

    const category = await JobsCategory.findOne({ _id: categoryId, type: type });
    
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: "Category not found with this Type and ID" 
      });
    }

    if (category.subCategory.includes(newSubCategoryName.trim())) {
      return res.status(400).json({ 
        success: false, 
        message: "This sub-category name already exists in this category" 
      });
    }

    const updatedCategory = await JobsCategory.findOneAndUpdate(
      { 
        _id: categoryId, 
        type: type, 
        subCategory: oldSubCategoryName.trim() 
      },
      { 
        $set: { "subCategory.$": newSubCategoryName.trim() } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found in this category (Check spelling/case)"
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub-category updated successfully",
      data: updatedCategory
    });

  } catch (error) {
    console.error("Update Sub-Category Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};