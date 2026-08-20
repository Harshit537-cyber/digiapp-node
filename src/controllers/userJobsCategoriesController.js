const JobsCategory = require('../../src/admin/models/JobsCategory'); 
const Job = require("../models/Job");
const mongoose = require("mongoose");


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


exports.getSubCategoriesByJobCategoryId = async (req, res) => {
  try {
    const { categoryId, type } = req.query;

    if (!categoryId || !type) {
      return res.status(400).json({
        success: false,
        message: "Both categoryId and type are required"
      });
    }
    const categoryData = await JobsCategory.findOne({ 
      _id: categoryId, 
      type: type, 
      status: true 
    }).select('name subCategory type');

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "No category found matching this ID and Type"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        categoryName: categoryData.name,
        jobType: categoryData.type,
        subCategories: categoryData.subCategory
      }
    });

  } catch (error) {
    console.error("Get Sub-Categories Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getJobsByFilter = async (req, res) => {
  try {
    const { jobCategory, categoryId, subCategory,lat, lng, radius  } = req.query;

    if (!jobCategory || !categoryId || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "jobCategory, categoryId, and subCategory are required"
      });
    }

    const query = {
      status: "active", 
      jobCategory: jobCategory, 
      category: new mongoose.Types.ObjectId(categoryId), 
      subCategory: { $regex: `^${subCategory.trim()}$`, $options: 'i' }
    };

if (lat && lng) {
      const radiusInKm = radius ? parseFloat(radius) : 5; 
      const radiusInRadians = radiusInKm / 6378.1;

      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInRadians],
        },
      };
    }

    const jobs = await Job.find(query)
      .populate('userId', 'name mobileNumber') 
      .populate('category', 'name') 
    .sort({ 
        isFeatured: -1, 
        createdAt: -1 
      });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });

  } catch (error) {
    console.error("Filter Jobs Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};