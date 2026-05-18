const TrustedContact = require("../models/TrustedContact");
const User = require("../models/User");
const trustedContactService = require("../services/trustedContact.service");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const{ sendNotification} =require("../utils/notification");

exports.addTrustedContact = async (req, res) => {
  try {
    const { name, relation, contactNumber } = req.body;
    const userId = req.user.userId;

     const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (currentUser.gender !== "female") {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Only female users can add trusted contacts." 
      });
    }
 await TrustedContact.deleteMany({ user: userId, status: "Rejected" });

    if (!contactNumber) {
      return res.status(400).json({ success: false, message: "Contact number is required" });
    }

    const existingCount = await TrustedContact.countDocuments({ user: userId });
    if (existingCount >= 3) {
      return res.status(400).json({ 
        success: false, 
        message: "Limit reached. You already have 3 trusted contacts. Please delete one to add a new one." 
      });
    }

    // const recipient = await User.findOne({
    //   $or: [
    //     { phoneNumber: contactNumber },
    //     { phone: contactNumber },
    //     { mobile: contactNumber }
    //   ]
    // });

    // if (!recipient) {
    //   return res.status(404).json({ 
    //     success: false, 
    //     message: "Recipient must have app installed. Check if number matches DB exactly." 
    //   });
    // }

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

 try {
      const targetUser = await User.findOne({
        $or: [{ phoneNumber: contactNumber }, { phone: contactNumber }, { mobile: contactNumber }]
      });

      console.log("1. Target User मिला?:", targetUser ? "हाँ" : "नहीं");
if (targetUser) console.log("2. उसका FCM Token है?:", targetUser.fcmToken ? "हाँ" : "नहीं");

      if (targetUser && targetUser.fcmToken) {
        await sendNotification(
          targetUser.fcmToken,
          "Trusted Contact Request 🤝",
          `${currentUser.name} wants to add you as their trusted contact.`,
          {
            type: "TRUSTED_CONTACT_REQUEST",
            contactId: savedContact._id.toString(),
            senderName: currentUser.name
          }
        );
      }
    } catch (notifErr) {
        console.log("3. नोटिफिकेशन भेजने में गलती हुई:", notifErr.message);
      console.log("Notification sending failed but contact saved:", notifErr.message);
    }


    return res.status(201).json({ success: true, message: "Request sent successfully", data: savedContact });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

 
    const incomingRequests = await TrustedContact.find({
      contactNumber: currentUser.phoneNumber, // सुनिश्चित करें कि फील्ड नाम 'phoneNumber' ही है
      status: "Pending"
    }).populate("user", "name phoneNumber image gender");

    return res.status(200).json({
      success: true,
      count: incomingRequests.length,
      data: incomingRequests
    });
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

     if (status === 'Rejected') {
      const deleted = await TrustedContact.findOneAndDelete({ _id: id, contactNumber: myNumber });
      if (!deleted) return res.status(404).json({ message: "Request not found" });
      return res.status(200).json({ success: true, message: "Request rejected and removed" });
    }
    const updated = await TrustedContact.findOneAndUpdate(
      { _id: id, contactNumber: myNumber },
      { status },
      { new: true }
    ).populate('user');

    if (!updated) {
      return res.status(404).json({ success: false, message: "Request not found for your number" });
    }
 if (status === 'Accepted') {
      const requester = await User.findById(updated.user); // रिक्वेस्ट भेजने वाली महिला
      if (requester && requester.fcmToken) {
        await sendNotification(
          requester.fcmToken,
          "Request Accepted ✅",
          `${currentUser.name} is now your trusted contact.`,
          { type: "REQUEST_ACCEPTED" }
        );
      }
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
    const contactId = req.params.id;
    const deletedContact = await TrustedContact.findByIdAndDelete(contactId);

    if (!deletedContact) {
      return res.status(404).json({ 
        success: false, 
        message: "Contact not found. Check if the ID is correct." 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Deleted successfully" 
    });

  } catch (error) { 
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    }); 
  }
};


exports.getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    
    const contacts = await TrustedContact.find({ user: loggedInUserId });

    return res.status(200).json({ 
      success: true, 
      loggedInUserId: loggedInUserId, 
      count: contacts.length,
      data: contacts 
    });

  } catch (error) { 
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    }); 
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
