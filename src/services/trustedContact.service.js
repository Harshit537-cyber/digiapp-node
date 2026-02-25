const TrustedContact = require('../models/TrustedContact');

module.exports = {
  createContact: async (data) => await TrustedContact.create(data),

  updateContact: async (id, userId, updateData) =>
    await TrustedContact.findOneAndUpdate({ _id: id, user: userId }, updateData, { new: true }),

  deleteContact: async (id, userId) =>
    await TrustedContact.findOneAndDelete({ _id: id, user: userId }),

  getAllContacts: async (userId) =>
    await TrustedContact.find({ user: userId }),

  getContactById: async (id, userId) =>
    await TrustedContact.findOne({ _id: id, user: userId }),

  getIncomingRequests: async (phoneNumber) =>
    await TrustedContact.find({ contactNumber: phoneNumber, status: 'Pending' }).populate('user'),

  respondToRequest: async (id, phoneNumber, status) =>
    await TrustedContact.findOneAndUpdate({ _id: id, contactNumber: phoneNumber }, { status }, { new: true }),

  blockContact: async (id, userId) => 
    await TrustedContact.findOneAndUpdate(
      { _id: id, user: userId }, 
      { status: 'Blocked' }, 
      { new: true }
    ),

  unblockContact: async (id, userId) => 
    await TrustedContact.findOneAndUpdate(
      { _id: id, user: userId }, 
      { status: 'Accepted' }, 
      { new: true }
    )

};



