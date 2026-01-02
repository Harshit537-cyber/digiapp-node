const trustedContactService = require("../services/trustedContact.service");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

exports.addTrustedContact = async (req, res) => {
  try {
    const { name, relation, contactNumber } = req.body;

    if (!name || !relation || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, relation, and contact number are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const localFilePath = req.file.path;

    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      folder: "trusted_contacts",
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    const contactData = {
      user: req.user.userId,
      name,
      relation,
      contactNumber,
      image: uploadResult.secure_url,
      status: "Pending",
    };

    const savedContact = await trustedContactService.createContact(contactData);

    return res.status(201).json({
      success: true,
      message: "Trusted contact request sent successfully",
      data: savedContact,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


exports.updateTrustedContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, relation, contactNumber, status } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (relation) updateData.relation = relation;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (status) updateData.status = status;

    if (req.file) {
      const localFilePath = req.file.path;

      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: "trusted_contacts",
      });

      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }

      updateData.image = uploadResult.secure_url;
    }

    const updatedContact = await trustedContactService.updateContact(
      id,
      req.user.userId,
      updateData
    );

    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: "Trusted contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trusted contact updated successfully",
      data: updatedContact,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
  

exports.deleteTrustedContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const deletedContact = await trustedContactService.deleteContact(
      id,
      req.user.userId
    );

    if (!deletedContact) {
      return res.status(404).json({
        success: false,
        message: "Trusted contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trusted contact deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
