// const Item = require('../models/Item');
// const SavedItems = require("../models/savedItems");

// // const createItem = async (itemData) => {
// //     const item = new Item(itemData);
// //     return await item.save();
// // };
// const createItem = async (data) => {
//   return await Item.create(data);
// };



// const getAllItems = async () => {
   
//     return await Item.find().populate('user', 'name email').sort({ createdAt: -1 });
// };


// const getItemById = async (itemId) => {
//     return await Item.findById(itemId).populate('user', 'name email');
// };


// const updateItem = async (itemId, updateData) => {
//     return await Item.findByIdAndUpdate(itemId, updateData, { new: true });
// };


// const deleteItem = async (itemId) => {
//     return await Item.findByIdAndDelete(itemId);
// };


// const activateItem = async (itemId) => {
//     return await Item.findByIdAndUpdate(itemId, { isActive: true }, { new: true });
// };


// const deactivateItem = async (itemId) => {
//     return await Item.findByIdAndUpdate(itemId, { isActive: false }, { new: true });
// };


// const searchItemsByTitle = async (query) => {
//     return await Item.find({
//         title: { $regex: query, $options: 'i' } 
//     }).populate('user', 'name email').sort({ createdAt: -1 });
// };

// const getUserItems = async (userId) => {
//     return await Item.find({ user: userId }).sort({ createdAt: -1 });
// };

// const searchUserItemsByTitle = async (userId, query) => {
//     return await Item.find({
//         user: userId, 
//         title: { $regex: query, $options: 'i' } 
//     }).sort({ createdAt: -1 });
// };


// // ✅ LATEST 10 ITEMS (your requirement)
// const getTop10LatestItems = async () => {
//   return await Item.find({ isActive: true })
//     .sort({ createdAt: -1 })
//     .limit(10);
// };
// const saveItem = async (userId, itemId) => {
//   return await SavedItems.findOneAndUpdate(
//     { user: userId, item: itemId },
//     {},
//     { upsert: true, new: true }
//   );
// };

// const unsaveItem = async (userId, itemId) => {
//   return await SavedItems.findOneAndDelete({
//     user: userId,
//     item: itemId
//   });
// };


// const getAllSavedItems = async (userId) => {
//   return await SavedItems.find({ user: userId })
//     .populate("item")
//     .sort({ createdAt: -1 });
// };


// const getNearbyShops = async (lat, lng, limit = 25) => {
//   return await Item.aggregate([
//     {
//       $geoNear: {
//         near: { type: "Point", coordinates: [lng, lat] },
//         distanceField: "distance",
//         maxDistance: 10000,
//         spherical: true,
//         query: {
//           category: "shops",
//           isActive: true
//         }
//       }
//     },
//     {
//       $addFields: {
//         planPriority: {
//           $switch: {
//             branches: [
//               { case: { $eq: ["$shopPlan", "pro"] }, then: 1 },
//               { case: { $eq: ["$shopPlan", "lite"] }, then: 2 }
//             ],
//             default: 3
//           }
//         }
//       }
//     },
//     { $sort: { planPriority: 1, createdAt: -1 } },
//     { $limit: limit }
//   ]);
// };

// const getSavedItemsByCategory = async (userId, category) => {
//   return await SavedItems.find({ user: userId })
//     .populate({
//       path: "item",
//       match: { category, isActive: true }
//     })
//     .sort({ createdAt: -1 });
// };



// module.exports = { 
//     createItem, 
//     getAllItems, 
//     getItemById,
//     updateItem, 
//     deleteItem ,
//     activateItem,
//     deactivateItem,
//     searchItemsByTitle,
//     getUserItems,
//     searchUserItemsByTitle,
//       getTop10LatestItems, 
//       saveItem,
//       unsaveItem,
//       getSavedItemsByCategory,
//       getAllSavedItems,
//       getNearbyShops

// };

const Item = require("../models/item");
const SavedItem = require("../models/savedItems");

/* ---------------- CREATE ---------------- */
const createItem = async (data) => {
  return await Item.create(data);
};

/* ---------------- GET ALL (FEATURED FIRST) ---------------- */
const getAllItems = async () => {
  return await Item.find({ isActive: true })
    .sort({ isFeatured: -1, createdAt: -1 })
    .populate("user", "name");
};

/* ---------------- TOP 10 LATEST ---------------- */
const getTop10LatestItems = async () => {
  return await Item.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(10);
};

/* ---------------- SINGLE ---------------- */
const getItemById = async (id) => {
  return await Item.findById(id).populate("user", "name");
};

/* ---------------- UPDATE ---------------- */
const updateItem = async (id, data) => {
  return await Item.findByIdAndUpdate(id, data, { new: true });
};

/* ---------------- DELETE ---------------- */
const deleteItem = async (id) => {
  return await Item.findByIdAndDelete(id);
};

/* ---------------- ACTIVATE / DEACTIVATE ---------------- */
const activateItem = async (id) => {
  return await Item.findByIdAndUpdate(id, { isActive: true }, { new: true });
};

const deactivateItem = async (id) => {
  return await Item.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

/* ---------------- SEARCH ---------------- */
const searchItemsByTitle = async (q) => {
  return await Item.find({
    isActive: true,
    title: { $regex: q, $options: "i" }
  }).sort({ isFeatured: -1 });
};

/* ---------------- USER ITEMS ---------------- */
const getUserItems = async (userId) => {
  return await Item.find({ user: userId }).sort({ createdAt: -1 });
};

const searchUserItemsByTitle = async (userId, q) => {
  return await Item.find({
    user: userId,
    title: { $regex: q, $options: "i" }
  });
};

/* ---------------- SAVE ITEM ---------------- */
const saveItem = async (userId, itemId) => {
  const exists = await SavedItem.findOne({ user: userId, item: itemId });
  if (exists) return exists;

  return await SavedItem.create({ user: userId, item: itemId });
};

const unsaveItem = async (userId, itemId) => {
  return await SavedItem.findOneAndDelete({ user: userId, item: itemId });
};

const getSavedItems = async (userId) => {
  return await SavedItem.find({ user: userId })
    .populate({
      path: "item",
      populate: { path: "user", select: "name" }
    })
    .sort({ createdAt: -1 });
};

/* ---------------- DISTANCE LOGIC ---------------- */
const getNearbyItems = async (lat, lng, distanceKm = 10) => {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;

  const items = await Item.find({ isActive: true });

  return items.filter((i) => {
    if (!i.location?.lat || !i.location?.lng) return false;

    const dLat = toRad(i.location.lat - lat);
    const dLng = toRad(i.location.lng - lng);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) *
        Math.cos(toRad(i.location.lat)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= distanceKm;
  });
};


const searchSavedItems = async (userId, query) => {
  return SavedItem.find({ user: userId })
    .populate({
      path: "item",
      match: { title: { $regex: query, $options: "i" } }
    });
};


module.exports = {
  createItem,
  getAllItems,
  getTop10LatestItems,
  getItemById,
  updateItem,
  deleteItem,
  activateItem,
  deactivateItem,
  searchItemsByTitle,
  getUserItems,
  searchUserItemsByTitle,
  saveItem,
  unsaveItem,
  getSavedItems,
  getNearbyItems,
  searchSavedItems
};
