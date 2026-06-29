const Review = require("../models/Review");
const Business = require("../models/Business");
const cloudinary = require("../config/cloudinary"); 
const fs = require("fs");

exports.createReview =  async (req, res) => {
  try {
        console.log("Logged in User:", req.user);
    const { businessId, rating, comment } = req.body;
const userId = req.user?._id || req.user?.id || req.user?.userId;
    if (!businessId || !rating) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ message: "Business ID and Rating are required" });
    }

    if (rating < 1 || rating > 5) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(404).json({ message: "Business not found" });
    }

    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "business_reviews",
          });
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return result.secure_url;
        } catch (uploadErr) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      imageUrls.push(...results.filter(url => url !== null));
    }


    const review = await Review.create({
      businessId,
      userId,
      rating: Number(rating),
      comment: comment || "", 
      images: imageUrls,
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });

  } catch (error) {
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already reviewed this business" 
      });
    }

    console.error("Review Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};