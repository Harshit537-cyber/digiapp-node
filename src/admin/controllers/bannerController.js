const Banner = require('../models/Banner');
const cloudinary = require('cloudinary'); 
const fs = require('fs');
const mongoose = require('mongoose');

exports.createBanner =  async (req, res) => {
  let localFilePath = null;
  try {
    const { title, description, isActive, position } = req.body;

    if (!title) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Banner title is required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Banner image is required" });
    }

    localFilePath = req.file.path;

    const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
      folder: 'app_banners'
    });

    const newBanner = await Banner.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      imageUrl: uploadResponse.secure_url, 
      isActive: isActive === undefined ? true : (String(isActive) === 'true'),
      position: position,
      createdBy: req.user.userId 
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: newBanner
    });

  } catch (error) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Banner Create Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Banner ID format" 
      });
    }

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ 
        success: false, 
        message: "Banner not found" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner fetched successfully",
      data: banner
    });

  } catch (error) {
    console.error("Get Banner Error:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Internal Server Error" 
    });
  }
};


exports.getAllBanners =  async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.isActive) filters.isActive = req.query.isActive === 'true';
    if (req.query.position) filters.position = req.query.position;

    const [banners, total] = await Promise.all([
      Banner.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Banner.countDocuments(filters)
    ]);

    return res.status(200).json({
      success: true,
      message: "Banners retrieved successfully",
      data: {
        banners,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    console.error("Get All Banners Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};


exports.updateBanner = async (req, res) => {
  let localFilePath = null;
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    const updateData = { ...req.body };

    if (req.file) {
      localFilePath = req.file.path;
      const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
        folder: 'app_banners'
      });

      if (banner.imageUrl) {
        const urlParts = banner.imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('.')[0];
        await cloudinary.uploader.destroy(`app_banners/${fileName}`);
      }

      updateData.imageUrl = uploadResponse.secure_url;
      if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    }

    if (updateData.isActive !== undefined) {
      updateData.isActive = String(updateData.isActive) === 'true';
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: updatedBanner
    });

  } catch (error) {
    if (localFilePath && fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (banner.imageUrl) {
      const urlParts = banner.imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('.')[0];
      await cloudinary.uploader.destroy(`app_banners/${fileName}`);
    }

    await Banner.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchBanners =  async (req, res) => {
  try {
    const { q, position, isActive, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    if (position) query.position = position;
    if (isActive) query.isActive = isActive === 'true';

    const [banners, total] = await Promise.all([
      Banner.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Banner.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: banners.length,
      totalCount: total,
      data: banners,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAppBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .select('-createdBy') 
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: banners.length,
      data: banners
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};