const BusinessCategory = require('../admin/models/BusinessCategory'); 
const Business = require("../models/Business");
const mongoose = require('mongoose')

exports.getAllCategoriesForUsers = async (req, res) => {
  try {
   
    const categories = await BusinessCategory.find({ 
      status: true, 
      type: "Business" 
    }).sort({ name: 1 }); 
    
  if (!categories || categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No categories available at the moment"
      });
    }

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories 
    });

  } catch (error) {
    console.error("User Get Categories Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getSubCategoriesByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params; 
    const categoryData = await BusinessCategory.findOne({ 
      _id: categoryId, 
      status: true 
    }).select('name subCategory image');

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "Category not found or is inactive"
      });
    }

    res.status(200).json({
      success: true,
      categoryName: categoryData.name, 
      subCategories: categoryData.subCategory 
    });

  } catch (error) {
    console.error("Get Sub-Categories Error:", error.message);
    
    if(error.kind === 'ObjectId') {
        return res.status(400).json({ success: false, message: "Invalid Category ID" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



exports.getBusinessesBySubCategory = async (req, res) => {
  try {
    const { subCategory, categoryId } = req.query;

    if (!subCategory || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Sub-category and Category ID are required"
      });
    }

    const query = {
      category: new mongoose.Types.ObjectId(categoryId), 
      subCategory: { $regex: `^${subCategory.trim()}$`, $options: 'i' } 
    };

    const businesses = await Business.find(query)
      .populate('category', 'name image') 
      .sort({ createdAt: -1 }); 

    res.status(200).json({
      success: true,
      count: businesses.length,
      data: businesses
    });

  } catch (error) {
    console.error("Filter Business Error:", error.message);
    
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};




