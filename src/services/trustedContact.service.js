const TrustedContact = require('../models/TrustedContact');

const createContact = async (data) => {
  try {
    const newContact = await TrustedContact.create(data);
    return newContact;
  } catch (error) {
    throw error;
  }
};



const updateContact = async (id, userId, updateData) => {
  return await TrustedContact.findOneAndUpdate(
    { _id: id, user: userId },
    updateData,
    { new: true }
  );
};

const deleteContact = async (id, userId) => {
  return await TrustedContact.findOneAndDelete({
    _id: id,
    user: userId,
  });
};


const getAllContacts = async (userId) => {
  return await TrustedContact.find({ user: userId });
};


const getContactById = async (id, userId) => {
  return await TrustedContact.findOne({ _id: id, user: userId });
};


module.exports = {
  createContact,
  updateContact,
  deleteContact,
  getAllContacts,
  getContactById
};