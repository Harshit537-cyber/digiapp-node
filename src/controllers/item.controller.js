// const itemService = require('../services/item.services');
// const response = require('../utils/response');
// const cloudinary = require("../config/cloudinary");
// const fs = require("fs");

// /** 
//  * Helper: Cloudinary par images upload karke local files delete karta hai
//  */
// const uploadImages = async (files) => {
//     if (!files || files.length === 0) return [];
    
//     const urls = [];
//     for (const file of files) {
//         try {
//             const result = await cloudinary.uploader.upload(file.path, { folder: "items" });
//             urls.push(result.secure_url);
//         } finally {
//             if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         }
//     }
//     return urls;
// };


// // latest 10
// const getTop10LatestItems = async (req, res) => {
//   try {
//     const items = await itemService.getTop10LatestItems();
//     res.status(200).json(items);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // --- Post New Item ---
// const postItem = async (req, res) => {
//     try {
//         // 1. Keys se extra spaces hatane ke liye (Postman/Frontend safety)
//         const body = {};
//         for (const key in req.body) {
//             body[key.trim()] = req.body[key];
//         }

//         const { title, details, category, price, location, call, chat, isFeatured } = body;

//         // 2. Validation
//         if (!details || !location) {
//             return response.error(res, "Details and Location are required", 400);
//         }

//         // 3. Image Upload
//         const imageUrls = await uploadImages(req.files);

//         // 4. Create Item
//         const newItem = await itemService.createItem({
//             title: title?.trim(),
//             details: details?.trim(),
//             category,
//             price: Number(price) || 0,
//             location: location?.trim(),
//             preferredCommunication: { 
//                 call: String(call) === 'true', 
//                 chat: String(chat) === 'true' 
//             },
//             isFeatured: String(isFeatured) === 'true',
//             images: imageUrls,
//             user: req.user.userId 
//         });

//         return response.success(res, "Item posted successfully", newItem);
//     } catch (error) {
//         console.error("Post Item Error:", error);
//         return response.error(res, error.message, 500);
//     }
// };

// // --- Get All Items ---
// const getAllItems = async (req, res) => {
//     try {
//         const items = await itemService.getAllItems();
//         return response.success(res, "Items fetched successfully", items);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };

// // --- Get Single Item ---
// const getItemById = async (req, res) => {
//     try {
//         const item = await itemService.getItemById(req.params.id);
//         if (!item) return response.error(res, "Item not found", 404);

//         return response.success(res, "Item details fetched", item);
//     } catch (error) {
//         const msg = error.kind === 'ObjectId' ? "Invalid Item ID" : error.message;
//         return response.error(res, msg, 500);
//     }
// };

// // --- Update Item ---
// const updateItem = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user.userId;

//         let item = await itemService.getItemById(id);
//         if (!item) return response.error(res, "Item not found", 404);

//         // Security Check
//         if (item.user._id.toString() !== userId) {
//             return response.error(res, "Unauthorized access", 403);
//         }

//         const { title, details, category, price, location, call, chat, isFeatured } = req.body;

//         // Agar nayi files hain toh upload karein, warna purani hi rehne dein
//         let imageUrls = item.images;
//         if (req.files && req.files.length > 0) {
//             imageUrls = await uploadImages(req.files);
//         }

//         const updateData = {
//             title: title?.trim() || item.title,
//             details: details?.trim() || item.details,
//             category: category || item.category,
//             price: price ? Number(price) : item.price,
//             location: location || item.location,
//             preferredCommunication: { 
//                 call: call !== undefined ? call === 'true' : item.preferredCommunication.call, 
//                 chat: chat !== undefined ? chat === 'true' : item.preferredCommunication.chat 
//             },
//             isFeatured: isFeatured !== undefined ? isFeatured === 'true' : item.isFeatured,
//             images: imageUrls
//         };

//         const updatedItem = await itemService.updateItem(id, updateData);
//         return response.success(res, "Item updated successfully", updatedItem);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };

// // --- Delete Item ---
// const deleteItem = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const item = await itemService.getItemById(id);

//         if (!item) return response.error(res, "Item not found", 404);

//         if (item.user._id.toString() !== req.user.userId) {
//             return response.error(res, "Unauthorized access", 403);
//         }

//         await itemService.deleteItem(id);
//         return response.success(res, "Item deleted successfully");
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };


// const activateItem = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user.userId;

//         const item = await itemService.getItemById(id);
//         if (!item) return response.error(res, "Item not found", 404);

//         // Security: Check if the user owns this item
//         if (item.user._id.toString() !== userId) {
//             return response.error(res, "Unauthorized access", 403);
//         }

//         const updatedItem = await itemService.activateItem(id);
//         return response.success(res, "Item activated successfully", updatedItem);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };

// // --- Deactivate Item ---
// const deactivateItem = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user.userId;

//         const item = await itemService.getItemById(id);
//         if (!item) return response.error(res, "Item not found", 404);

        
//         if (item.user._id.toString() !== userId) {
//             return response.error(res, "Unauthorized access", 403);
//         }

//         const updatedItem = await itemService.deactivateItem(id);
//         return response.success(res, "Item deactivated successfully", updatedItem);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };

// const searchItems = async (req, res) => {
//     try {
//         const { q } = req.query; 

//         if (!q) {
//             return response.error(res, "Search query is required", 400);
//         }

//         const items = await itemService.searchItemsByTitle(q);
//         return response.success(res, "Search results fetched successfully", items);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };


// const getMyItems = async (req, res) => {
//     try {
//         const userId = req.user.userId; 
//         const items = await itemService.getUserItems(userId);
        
//         return response.success(res, "Your items fetched successfully", items);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };


// const searchMyItems = async (req, res) => {
//     try {
//         const userId = req.user.userId; 
//         const { q } = req.query; 

//         if (!q) {
//             return response.error(res, "Search query is required", 400);
//         }

//         const items = await itemService.searchUserItemsByTitle(userId, q);
//         return response.success(res, "Filtered personal items fetched successfully", items);
//     } catch (error) {
//         return response.error(res, error.message, 500);
//     }
// };


// const saveItem = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const { itemId } = req.params;

//     const saved = await itemService.saveItem(userId, itemId);
//     return response.success(res, "Item saved successfully", saved);
//   } catch (error) {
//     return response.error(res, error.message, 500);
//   }
// };

// const unsaveItem = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const { itemId } = req.params;

//     await itemService.unsaveItem(userId, itemId);
//     return response.success(res, "Item removed from saved");
//   } catch (error) {
//     return response.error(res, error.message, 500);
//   }
// };


// const getSavedSellBuyItems = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const items = await itemService.getSavedItemsByCategory(userId, "sellbuy");

//     return response.success(res, "Saved sell/buy items fetched", items);
//   } catch (error) {
//     return response.error(res, error.message, 500);
//   }
// };


// const getSavedShopItems = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const items = await itemService.getSavedItemsByCategory(userId, "shops");

//     return response.success(res, "Saved shop items fetched", items);
//   } catch (error) {
//     return response.error(res, error.message, 500);
//   }
// };


// module.exports = { 
//     postItem, 
//     getAllItems, 
//     getItemById,
//     updateItem, 
//     deleteItem ,
//     activateItem, 
//     deactivateItem ,
//     searchItems,
//     getMyItems,
//     searchMyItems,
//     getTop10LatestItems
// };

const itemService = require('../services/item.services');
const response = require('../utils/response');

const cloudinary = require("../config/cloudinary");
const fs = require("fs");




/* ================= GET ALL ================= */
const getAllItems = async (req, res) => {
  try {
    const items = await itemService.getAllItems();
    return response.success(res, "Items fetched successfully", items);
  } catch (error) {
    console.error("getAllItems error:", error);
    return response.error(res, "Server error", 500);
  }
};




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



/* ================= TOP 10 ================= */
const getTop10LatestItems = async (req, res) => {
  try {
    const items = await itemService.getTop10LatestItems();
    return response.success(res, "Latest items fetched", items);
  } catch (error) {
    return response.error(res, error.message, 500);
  }
};

/* ================= CREATE ================= */
const postItem = async (req, res) => {
  try {
    const body = {};
    for (const key in req.body) body[key.trim()] = req.body[key];

    const { title, details, category, price, location, call, chat, isFeatured } = body;

    if (!details || !location) {
      return response.error(res, "Details and Location are required", 400);
    }

    const imageUrls = await uploadImages(req.files);

    const item = await itemService.createItem({
      title: title?.trim(),
      details: details?.trim(),
      category,
      price: Number(price) || 0,
      location,
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

    const updated = await itemService.updateItem(id, {
      ...req.body,
      images: imageUrls
    });

    return response.success(res, "Item updated successfully", updated);
  } catch (error) {
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
// const getMyItems = async (req, res) => {
//   try {
//     const items = await itemService.getUserItems(req.user.userId);
//     return response.success(res, "My items fetched", items);
//   } catch (error) {
//     return response.error(res, error.message, 500);
//   }
// };
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

/* ================= SAVE / UNSAVE ================= */
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
