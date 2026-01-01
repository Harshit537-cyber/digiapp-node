const bloodRequestService = require("../services/bloodRequest.services");
const response = require("../utils/response");

const createBloodRequest = async (req, res) => {
  try {
    const {
      patientName,
      bloodGroup,
      urgency,
      hospitalName,
      location,
      contactNumber,
      whatsappNumber,
      additionalInfo,
    } = req.body || {};

    if (
      !patientName ||
      !bloodGroup ||
      !urgency ||
      !hospitalName ||
      !location ||
      !contactNumber ||
      !whatsappNumber ||
      !additionalInfo
    ) {
      return response.error(
        res,
        "All required fields must be filled",
        400
      );
    }

    const bloodRequest = await bloodRequestService.createBloodRequest({
      patientName,
      bloodGroup,
      urgency,
      hospitalName,
      location,
      contactNumber,
      whatsappNumber,
      additionalInfo,
    });

    return response.success(
      res,
      "Blood request created successfully",
      bloodRequest
    );

  } catch (error) {
    console.error(error);
    return response.error(res, "Server error", 500);
  }
};



const updateBloodRequest = async (req, res) => {
  try {
    const { id } = req.params; 
    const updateData = req.body;

    
    if (Object.keys(updateData).length === 0) {
      return response.error(res, "Please provide fields to update", 400);
    }

    const updatedRequest = await bloodRequestService.updateBloodRequest(id, updateData);

    
    if (!updatedRequest) {
      return response.error(res, "Blood request not found", 404);
    }

    return response.success(
      res,
      "Blood request updated successfully",
      updatedRequest
    );

  } catch (error) {
    console.error(error);
    return response.error(res, error.message || "Server error", 500);
  }
};



const deleteBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return response.error(res, "Blood request ID is required", 400);
    }

    const deletedRequest =
      await bloodRequestService.deleteBloodRequestById(id);

    if (!deletedRequest) {
      return response.error(res, "Blood request not found", 404);
    }

    return response.success(
      res,
      "Blood request deleted successfully",
      deletedRequest
    );
  } catch (error) {
    console.error(error);
    return response.error(res, "Server error", 500);
  }
};




/* 🔹 GET all blood requests */
const getAllBloodRequests = async (req, res) => {
  try {
    const requests = await bloodRequestService.getAllBloodRequests();
    return response.success(res, "All blood requests fetched", requests);
  } catch (error) {
    console.error(error);
    return response.error(res, "Server error", 500);
  }
};



/* 🔹 GET single blood request by ID */
const getBloodRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return response.error(res, "Blood request ID is required", 400);
    }

    const request = await bloodRequestService.getBloodRequestById(id);

    if (!request) {
      return response.error(res, "Blood request not found", 404);
    }

    return response.success(res, "Blood request fetched", request);
  } catch (error) {
    console.error(error);
    return response.error(res, "Server error", 500);
  }
};





module.exports = {
  createBloodRequest,
  updateBloodRequest,
  deleteBloodRequest,
  getAllBloodRequests,
  getBloodRequestById,
};
