const mongoose = require("mongoose");
const itemService = require("../services/item.services");
const response = require("../utils/response");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const Item = require("../models/Item");
const ItemCategory = require("../admin/models/ItemCategory");
const User = require("../models/User")

/* ================= IMAGE UPLOAD ================= */
const uploadImages = async (files) => {
  if (!files || files.length === 0) return [];
  const urls = [];

  for (const file of files) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "items",
      });
      urls.push(result.secure_url);
    } finally {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }
  return urls;
};

const postItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    console.log(req.body);
    const body = {};
    for (const key in req.body) body[key.trim()] = req.body[key];

    const { title, details, category, subCategory, price, call, chat, isFeatured, location } = body;
    const longitude = body.longitude;
    const latitude = body.latitude;
    const address = body.address

    if (!title || !details || !latitude || !longitude) {
      console.log(title, details, longitude)
      return response.error(
        res,
        "Title, Details, Latitude and Longitude are required",
        400,
      );
    }
    if (!category || !subCategory) {
      return response.error(res, "Category and Sub-category are required", 400);
    }

    const catData = await ItemCategory.findById(category);
    if (!catData) {
      return response.error(res, "Selected Category not found", 404);
    }

    if (!catData.subCategory.includes(subCategory)) {
      return response.error(res, `Invalid sub-category. Select from ${catData.name}`, 400);
    }


    const POST_COST = 25;
    const FEATURED_ADDON = 25;
    const isFeaturedTrue = String(isFeatured) === "true";
    const totalCreditsNeeded = isFeaturedTrue ? (POST_COST + FEATURED_ADDON) : POST_COST;

    const days = isFeaturedTrue ? 3 : 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const user = await User.findById(req.user.userId).session(session);
    if (!user) throw new Error("User not found");

    if (user.credits < totalCreditsNeeded) {
      throw new Error(`Insufficient credits. You need ${totalCreditsNeeded} credits.`);
    }

    user.credits -= totalCreditsNeeded;
    await user.save({ session });
    const imageUrls = await uploadImages(req.files);

    const item = await itemService.createItem({
      title: title?.trim(),
      details: details?.trim(),
      category: category,
      subCategory: subCategory,

      price: Number(price) || 0,

      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
        address: address?.trim(),
      },

      preferredCommunication: {
        call: String(call) === "true",
        chat: String(chat) === "true",
      },

      isFeatured: isFeaturedTrue,
      expiryDate: expiryDate,
      images: imageUrls,
      user: req.user.userId,
      creditsInfo: {
        totalCreditsUsed: totalCreditsNeeded,
        postCost: POST_COST,
        featuredAddonCost: isFeaturedTrue ? FEATURED_ADDON : 0,
      },
    }, session);

    await session.commitTransaction();
    session.endSession();

    return response.success(res, "Item posted successfully", item);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("postItem error:", error);
    return response.error(res, error.message, 500);
  }
};

/* ================= GET ALL ================= */
const getAllItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const category = req.query.category;
    const subCategory = req.query.subCategory;

  const { lat, lng, radius } = req.query;

    const result = await itemService.getAllItems(page, limit, category, subCategory, lat, lng, radius);
let items = result.items || (Array.isArray(result) ? result : []);

    if (items.length > 0) {
      const categoryIds = [...new Set(items.map(i => i.category?.toString()).filter(id => id))];

      const categoriesData = await ItemCategory.find({ _id: { $in: categoryIds } }).select('name');

      const catLookup = {};
      categoriesData.forEach(cat => {
        catLookup[cat._id.toString()] = cat.name;
      });

      const updatedItems = items.map(item => {
        const i = item.toObject ? item.toObject() : JSON.parse(JSON.stringify(item));
        return {
          ...i,
          category: i.category ? (catLookup[i.category.toString()] || i.category) : i.category
        };
      });

      if (result.items) {
        result.items = updatedItems;
      } else if (Array.isArray(result)) {
        return response.success(res, "Items fetched successfully", updatedItems);
      }
    }


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
     const categoryDoc = await ItemCategory.findById(item.category);
    
    if (categoryDoc) {
      item._doc.category = categoryDoc.name; 
    }
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
        address: updateData.address?.trim(),
      };

      // Remove temporary fields from the body copy before passing to Mongoose
      delete updateData.latitude;
      delete updateData.longitude;
      delete updateData.address;
    }

    // Add images
    updateData.images = imageUrls;

    // Handle preferredCommunication fields which Mongoose expects as nested updates
    if (updateData.call !== undefined)
      updateData["preferredCommunication.call"] =
        String(updateData.call) === "true";
    if (updateData.chat !== undefined)
      updateData["preferredCommunication.chat"] =
        String(updateData.chat) === "true";

    // Handle isFeatured
    if (updateData.isFeatured !== undefined)
      updateData.isFeatured = String(updateData.isFeatured) === "true";

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
// const activateItem = async (req, res) => {
//   try {
//     const item = await itemService.activateItem(req.params.id);
//     return response.success(res, "Item activated", item);
//   } catch (error) {
//     return response.error(res, error.message, 500);
//   }
// };

const activateItem = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.error(res, "Invalid Item ID format", 400);
    }

    const item = await itemService.activateItem(id);

    if (!item) {
      return response.error(res, "Item not found or already deleted", 404);
    }

    // 5. Success Response
    return response.success(res, "Item activated successfully", item, 200);

  } catch (error) {
    // 6. Logging for Debugging (Server Side)
    console.error(`[ActivateItem Error] ID: ${id} | Error: ${error.message}`);

    // 7. Generic Error for Client
    return response.error(res, "An internal server error occurred", 500);
  }
};



const deactivateItem =  async (req, res) => {
  const { id: itemId } = req.params;
  const userId = req.user?.userId;

  try {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Item ID format."
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again."
      });
    }

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found."
      });
    }


    if (item.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own items."
      });
    }

    await Item.findByIdAndDelete(itemId);

    return res.status(200).json({
      success: true,
      message: "Your item has been successfully and permanently removed."
    });

  } catch (error) {
    console.error(`[DEACTIVATE_ITEM_ERROR] | ItemID: ${itemId} | UserID: ${userId} | Error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while deleting the item."
    });
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
    const items = await itemService.searchUserItemsByTitle(
      req.user.userId,
      req.query.q,
    );
    return response.success(res, "Filtered items", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

const saveItem = async (req, res) => {
  try {
    const saved = await itemService.saveItem(
      req.user.userId,
      req.params.itemId,
    );
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
      req.query.q,
    );
    return response.success(res, "Saved search results", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

const getCategoriesData = async (req, res) => {
  try {
    const { category } = req.query;
    if (category) {

      const subCategories = await Item.distinct("subCategory", {
        category: category.trim(),
        subCategory: { $ne: null, $exists: true }
      });

      return response.success(res, `Sub-categories for ${category} fetched`, {
        categoryName: category.trim(),
        subCategories: subCategories
      });

    } else {
      const allMainCategories = await Item.distinct("category", {
        category: { $ne: null, $exists: true }
      });

      return response.success(res, "All available categories fetched", {
        categories: allMainCategories
      });
    }

  } catch (error) {
    console.error("getCategoriesData error:", error);
    return response.error(res, error.message, 500);
  }
};

const getNearbyItemsLists = async (req, res) => {
  try {
    const { longitude, latitude } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: "Location missing" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const distanceInDegrees = 20 / 111.12;

    const items = await Item.find({
      isActive: true,
      expiryDate: { $gt: new Date() },
      "location.coordinates.1": {
        $gte: lat - distanceInDegrees,
        $lte: lat + distanceInDegrees
      },
      "location.coordinates.0": {
        $gte: lng - distanceInDegrees,
        $lte: lng + distanceInDegrees
      }
    }).limit(50).lean();

const dataWithNames = await Promise.all(items.map(async (item) => {
      if (item.category) {
        const categoryDoc = await ItemCategory.findById(item.category).select('name');
        
        return {
          ...item,
          category: categoryDoc ? categoryDoc.name : item.category
        };
      }
      return item;
    }));

    return res.status(200).json({
      success: true,
      count:  dataWithNames.length,
      data: dataWithNames,
    });
  } catch (error) {
    console.error("Nearby Logic Error:", error);
    return res.status(500).json({ success: false, message: error.message });
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
  searchSavedItems,
  getCategoriesData,
  getNearbyItemsLists
}
