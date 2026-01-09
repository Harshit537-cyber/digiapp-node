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

module.exports = { 
    createItem, 
    getAllItems, 
    getItemById,
    updateItem, 
    deleteItem  
};