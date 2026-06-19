const ItemCategory = require("../admin/models/ItemCategory");
const Item = require("../models/Item");
const mongoose = require("mongoose")


exports.getAllItemCategoriesForUsers = async (req, res) => {
  try {
    const categories = await ItemCategory.find()
      .select('name image subCategory') 
      .sort({ name: 1 });

    if (!categories || categories.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No categories found",
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error("Get All Item Categories Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getSubCategoriesByItemId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const categoryData = await ItemCategory.findOne({ 
      _id: categoryId, 
      status: true 
    }).select('name subCategory image');

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "Item Category not found or is inactive"
      });
    }

    res.status(200).json({
      success: true,
      categoryName: categoryData.name,
      subCategories: categoryData.subCategory 
    });

  } catch (error) {
    console.error("Get Item Sub-Categories Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getItemsByFilter = async (req, res) => {
  try {
    const sanitizedQuery = {};
    Object.keys(req.query).forEach((key) => {
      sanitizedQuery[key.trim()] = req.query[key].trim();
    });

    const { categoryId, subCategory } = sanitizedQuery;
    if (!categoryId || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "Both categoryId and subCategory name are required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId format",
      });
    }

    const query = {
      isActive: true,
      category: new mongoose.Types.ObjectId(categoryId),
      subCategory: { $regex: `^${subCategory}$`, $options: "i" },
      expiryDate: { $gt: new Date() },
    };

    const items = await Item.find(query)
      .populate("category", "name")
      .populate("user", "name mobileNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Filter Items Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};