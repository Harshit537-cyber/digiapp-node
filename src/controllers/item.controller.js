const mongoose = require('mongoose'); 
const itemService = require('../services/item.services');
const response = require('../utils/response');
const cloudinary = require("../config/cloudinary");
const fs = require("fs");



/* ================= IMAGE UPLOAD ================= */
const uploadImages = async (files) => {
  if (!files || files.length === 0) return [];
  const urls = [];

  for (const file of files) {
    try {
      const result = await cloudinary.uploader.upload(file.path, { folder: "items" });
      urls.push(result.secure_url);
    } finally {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }
  return urls;
};



/* ================= CREATE ================= */
const postItem = async (req, res) => {
  try {
    const body = {};
    for (const key in req.body) body[key.trim()] = req.body[key];

    const {
      title,
      details,
      category,
      subCategory, 
      subSubCategory,
      price,
      call,
      chat,
      isFeatured
    } = body;

    const longitude = body["location[coordinates][0]"];
    const latitude = body["location[coordinates][1]"];
    const address = body["location[address]"];

    if (!title || !details || !latitude || !longitude) {
      console.log(title, Details, Longitude)
      return response.error(
        res,
        "Title, Details, Latitude and Longitude are required",
        400
      );
    }

    const imageUrls = await uploadImages(req.files);

    const item = await itemService.createItem({
      title: title?.trim(),
      details: details?.trim(),
      category: category?.trim(),
      subCategory: subCategory?.trim() || null,
      subSubCategory: subSubCategory?.trim() || null,
      price: Number(price) || 0,

      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
        address: address?.trim()
      },

      preferredCommunication: {
        call: String(call) === "true",
        chat: String(chat) === "true"
      },

      isFeatured: String(isFeatured) === "true",

      images: imageUrls,
      user: req.user.userId
    });

    return response.success(res, "Item posted successfully", item);

  } catch (error) {
    console.error("postItem error:", error);
    return response.error(res, error.message, 500);
  }
};



 

/* ================= GET ALL ================= */
const getAllItems = async (req, res) => {
  try {
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await itemService.getAllItems(page, limit);

    return response.success(res, "Items fetched successfully", result);
  } catch (error) {
    console.error("getAllItems error:", error);
    return response.error(res, "Server error", 500);
  }
};

/* ================= TOP 10 ================= */
const getTop10LatestItems = async (req, res) => {
  try {
    const items = await itemService.getTop10LatestItems();
    return response.success(res, "Latest items fetched", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};


const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.error(res, "Invalid item id", 400);
    }

    const item = await itemService.getItemById(id);
    if (!item) return response.error(res, "Item not found", 404);

    return response.success(res, "Item fetched", item);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};


/* ================= UPDATE ================= */
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const item = await itemService.getItemById(id);
    if (!item) return response.error(res, "Item not found", 404);
    if (item.user._id.toString() !== userId) {
      return response.error(res, "Unauthorized access", 403);
    }

    let imageUrls = item.images;
    if (req.files?.length) imageUrls = await uploadImages(req.files);

    const updateData = { ...req.body };
    
    // Clear the old location field to prevent accidental string update
    delete updateData.location; 

    // ✅ FIX: Construct new location object only if all required fields are present
    if (updateData.latitude && updateData.longitude && updateData.address) {
      updateData.location = {
        lat: Number(updateData.latitude),
        lng: Number(updateData.longitude),
        address: updateData.address?.trim()
      };
      
      // Remove temporary fields from the body copy before passing to Mongoose
      delete updateData.latitude;
      delete updateData.longitude;
      delete updateData.address;
    }
    
    // Add images
    updateData.images = imageUrls;
    
    // Handle preferredCommunication fields which Mongoose expects as nested updates
    if (updateData.call !== undefined) updateData['preferredCommunication.call'] = String(updateData.call) === 'true';
    if (updateData.chat !== undefined) updateData['preferredCommunication.chat'] = String(updateData.chat) === 'true';
    
    // Handle isFeatured
    if (updateData.isFeatured !== undefined) updateData.isFeatured = String(updateData.isFeatured) === 'true';
    
    // Remove original call/chat/isFeatured before passing to service to prevent conflict
    delete updateData.call;
    delete updateData.chat;
    // We keep updateData.isFeatured if it's not handled above and is not a string 'true'/'false' but it should be fine now.

    const updated = await itemService.updateItem(id, updateData);

    return response.success(res, "Item updated successfully", updated);
  } catch (error) {
    console.error("updateItem error:", error);
    return response.error(res, error.message, 500);
  }
};


/* ================= DELETE ================= */
const deleteItem = async (req, res) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) return response.error(res, "Item not found", 404);

    if (item.user._id.toString() !== req.user.userId) {
      return response.error(res, "Unauthorized access", 403);
    }

    await itemService.deleteItem(req.params.id);
    return response.success(res, "Item deleted successfully");
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

/* ================= ACTIVATE / DEACTIVATE ================= */
// ... (No change in activateItem/deactivateItem)
const activateItem = async (req, res) => {
  try {
    const item = await itemService.activateItem(req.params.id);
    return response.success(res, "Item activated", item);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

const deactivateItem = async (req, res) => {
  try {
    const item = await itemService.deactivateItem(req.params.id);
    return response.success(res, "Item deactivated", item);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

/* ================= SEARCH ================= */
// ... (No change in searchItems)
const searchItems = async (req, res) => {
  try {
    if (!req.query.q) return response.error(res, "Search query required", 400);
    const items = await itemService.searchItemsByTitle(req.query.q);
    return response.success(res, "Search results", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};


/* ================= MY ITEMS ================= */
const getMyItems = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const items = await itemService.getUserItems(userId);
    return response.success(res, "My items fetched", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};


const searchMyItems = async (req, res) => {
  try {
    if (!req.query.q) return response.error(res, "Search query required", 400);
    const items = await itemService.searchUserItemsByTitle(req.user.userId, req.query.q);
    return response.success(res, "Filtered items", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};


const saveItem = async (req, res) => {
  try {
    const saved = await itemService.saveItem(req.user.userId, req.params.itemId);
    return response.success(res, "Item saved successfully", saved);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

const unsaveItem = async (req, res) => {
  try {
    await itemService.unsaveItem(req.user.userId, req.params.itemId);
    return response.success(res, "Item unsaved");
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

const getSavedItems = async (req, res) => {
  try {
    const items = await itemService.getSavedItems(req.user.userId);
    return response.success(res, "Saved items fetched", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

const searchSavedItems = async (req, res) => {
  try {
    const items = await itemService.searchSavedItems(
      req.user.userId,
      req.query.q
    );
    return response.success(res, "Saved search results", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};


module.exports = {
  postItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  activateItem,
  deactivateItem,
  searchItems,
  getMyItems,
  searchMyItems,
  getTop10LatestItems,
  saveItem,
  unsaveItem,
  getSavedItems,
  searchSavedItems
};