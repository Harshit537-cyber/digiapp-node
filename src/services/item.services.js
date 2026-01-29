const Item = require('../models/Item');


const createItem = async (itemData) => {
    const item = new Item(itemData);
    return await item.save();
};


const getAllItems = async () => {
   
    return await Item.find().populate('user', 'name email').sort({ createdAt: -1 });
};


const getItemById = async (itemId) => {
    return await Item.findById(itemId).populate('user', 'name email');
};


const updateItem = async (itemId, updateData) => {
    return await Item.findByIdAndUpdate(itemId, updateData, { new: true });
};


const deleteItem = async (itemId) => {
    return await Item.findByIdAndDelete(itemId);
};


const activateItem = async (itemId) => {
    return await Item.findByIdAndUpdate(itemId, { isActive: true }, { new: true });
};


const deactivateItem = async (itemId) => {
    return await Item.findByIdAndUpdate(itemId, { isActive: false }, { new: true });
};


const searchItemsByTitle = async (query) => {
    return await Item.find({
        title: { $regex: query, $options: 'i' } 
    }).populate('user', 'name email').sort({ createdAt: -1 });
};

const getUserItems = async (userId) => {
    return await Item.find({ user: userId }).sort({ createdAt: -1 });
};

const searchUserItemsByTitle = async (userId, query) => {
    return await Item.find({
        user: userId, 
        title: { $regex: query, $options: 'i' } 
    }).sort({ createdAt: -1 });
};


// ✅ LATEST 10 ITEMS (your requirement)
const getTop10LatestItems = async () => {
  return await Item.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(10);
};



module.exports = { 
    createItem, 
    getAllItems, 
    getItemById,
    updateItem, 
    deleteItem ,
    activateItem,
    deactivateItem,
    searchItemsByTitle,
    getUserItems,
    searchUserItemsByTitle,
      getTop10LatestItems
};