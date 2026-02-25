const TrustedContact = require("../models/TrustedContact");
const User = require("../models/User");
const trustedContactService = require("../services/trustedContact.service");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

exports.addTrustedContact = async (req, res) => {
  try {
    const { name, relation, contactNumber } = req.body;
    const userId = req.user.userId;

    if (!contactNumber) {
      return res.status(400).json({ success: false, message: "Contact number is required" });
    }

    const existingCount = await TrustedContact.countDocuments({ user: userId });
    if (existingCount >= 3) {
      return res.status(400).json({ success: false, message: "Limit reached. Max 3 contacts allowed." });
    }

    const recipient = await User.findOne({
      $or: [
        { phoneNumber: contactNumber },
        { phone: contactNumber },
        { mobile: contactNumber }
      ]
    });

    if (!recipient) {
      return res.status(404).json({ 
        success: false, 
        message: "Recipient must have app installed. Check if number matches DB exactly." 
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: "trusted_contacts" });
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const savedContact = await trustedContactService.createContact({
      user: userId, 
      name, 
      relation, 
      contactNumber, 
      image: uploadResult.secure_url, 
      status: "Pending"
    });

    return res.status(201).json({ success: true, message: "Request sent successfully", data: savedContact });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIncomingRequests = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const myNumber = currentUser.phoneNumber || currentUser.phone || currentUser.mobile;

    const requests = await TrustedContact.find({ 
      contactNumber: myNumber, 
      status: "Pending" 
    }).populate("user", "name phoneNumber phone mobile");

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const currentUser = await User.findById(req.user.userId);
    const myNumber = currentUser.phoneNumber || currentUser.phone || currentUser.mobile;

    const updated = await TrustedContact.findOneAndUpdate(
      { _id: id, contactNumber: myNumber },
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Request not found for your number" });
    }

    return res.status(200).json({ success: true, message: `Request ${status} successfully`, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTrustedContact = async (req, res) => {
  try {
    const updated = await trustedContactService.updateContact(req.params.id, req.user.userId, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) { 
    return res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.deleteTrustedContact = async (req, res) => {
  try {
    await trustedContactService.deleteContact(req.params.id, req.user.userId);
    return res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) { 
    return res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await trustedContactService.getAllContacts(req.user.userId);
    return res.status(200).json({ success: true, data: contacts });
  } catch (error) { 
    return res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.getContactById = async (req, res) => {
  try {
    const contact = await trustedContactService.getContactById(req.params.id, req.user.userId);
    return res.status(200).json({ success: true, data: contact });
  } catch (error) { 
    return res.status(500).json({ success: false, message: error.message }); 
  }
};


exports.blockContact = async (req, res) => {
  try {
    const updated = await trustedContactService.blockContact(req.params.id, req.user.userId);
    if (!updated) return res.status(404).json({ success: false, message: "Contact not found" });
    
    return res.status(200).json({ success: true, message: "Blocked successfully", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockContact = async (req, res) => {
  try {
    const updated = await trustedContactService.unblockContact(req.params.id, req.user.userId);
    if (!updated) return res.status(404).json({ success: false, message: "Contact not found" });
    
    return res.status(200).json({ success: true, message: "Unblocked successfully", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
