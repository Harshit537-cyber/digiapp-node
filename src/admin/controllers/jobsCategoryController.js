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
      createdBy: req.user?.id // Admin ID
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


exports.getAllJobsCategories = async (req, res) => {
  try {
    const { type } = req.query;

    let query = { status: true }; 

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


