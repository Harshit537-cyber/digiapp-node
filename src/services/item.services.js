
const mongoose = require("mongoose");

const Item = require("../models/Item");
const SavedItem = require("../models/savedItems");

/* ---------------- CREATE ---------------- */
const createItem = async (data) => {
  return await Item.create(data);
};

/* ---------------- GET ALL (FEATURED FIRST) ---------------- */
const getAllItems = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;


  const totalItems = await Item.countDocuments({ isActive: true });


  const items = await Item.find({ isActive: true })
    .sort({ isFeatured: -1, createdAt: -1 }) 
    .skip(skip)
    .limit(limit)
    .populate("user", "name");

  return {
    items,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: Number(page),
      limit: Number(limit),
    },
  };
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
  const populateOptions = {
    path: "item"
  };

  // apply regex ONLY when query is a valid string
  if (query && typeof query === "string") {
    populateOptions.match = {
      title: { $regex: query, $options: "i" }
    };
  }

  return SavedItem.find({ user: userId }).populate(populateOptions);
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
