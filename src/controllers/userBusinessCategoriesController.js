const BusinessCategory = require('../admin/models/BusinessCategory'); 
const Business = require("../models/Business");
const mongoose = require('mongoose');
const Review = require("../models/Review");

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



exports.getBusinessesBySubCategory =  async (req, res) => {
  try {
    const { subCategory, categoryId, lat, lng } = req.query;
    const radius = Math.min(parseInt(req.query.radius) || 5, 300); 

    if (!subCategory || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Sub-category and Category ID are required"
      });
    }

    let pipeline = [];

    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: radius * 1000,
          query: { 
            category: new mongoose.Types.ObjectId(categoryId),
            subCategory: { $regex: `^${subCategory.trim()}$`, $options: 'i' },
          status: { $in: ['Approved', 'Active'] }
          },
          spherical: true,
        },
      });
    } else {
      pipeline.push({
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          subCategory: { $regex: `^${subCategory.trim()}$`, $options: 'i' },
          status: 'Approved'
        }
      });
    }

    pipeline.push({
      $lookup: {
        from: "businesscategories", 
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails"
      }
    });
    pipeline.push({ $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } });

    const businesses = await Business.aggregate(pipeline);

    if (businesses.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const businessIds = businesses.map(b => new mongoose.Types.ObjectId(b._id));
    const ratingsData = await Review.aggregate([
      { $match: { businessId: { $in: businessIds } } },
      { $group: { _id: "$businessId", averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
    ]);

    const businessesWithRatings = businesses.map(b => {
      const ratingInfo = ratingsData.find(r => r._id.toString() === b._id.toString());
      
      const distInKm = b.distance ? b.distance / 1000 : 0;
      const distanceBucket = Math.floor(distInKm / 5);

      return {
        ...b,
        category: b.categoryDetails ? b.categoryDetails.name : null,
        averageRating: ratingInfo ? parseFloat(ratingInfo.averageRating.toFixed(1)) : 0,
        totalReviews: ratingInfo ? ratingInfo.totalReviews : 0,
        distanceBucket: distanceBucket
      };
    });

    businessesWithRatings.sort((a, b) => {
      if (a.distanceBucket !== b.distanceBucket) {
        return a.distanceBucket - b.distanceBucket;
      }

      const aIsTrusted = a.badge && a.badge.includes("Trusted") ? 1 : 0;
      const bIsTrusted = b.badge && b.badge.includes("Trusted") ? 1 : 0;
      if (aIsTrusted !== bIsTrusted) {
        return bIsTrusted - aIsTrusted; 
      }

      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }

      return 0;
    });

    res.status(200).json({
      success: true,
      count: businessesWithRatings.length,
      data: businessesWithRatings
    });

  } catch (error) {
    console.error("Filter Business Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

