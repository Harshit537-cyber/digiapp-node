const bloodRequestService = require("../services/bloodRequest.services");
const response = require("../utils/response");

const createBloodRequest = async (req, res) => {
  try {
    console.log("Token User Data:", req.user);

    if (!req.body) {
      return res.status(400).json({ message: "Request body missing" });
    }
    const {
      patientName,
      bloodGroup,
      urgency,
      hospitalName,
      location,
      contactNumber,
      whatsappNumber,
      additionalInfo,
    } = req.body;

    
    const bloodRequestData = {
      userId: req.user.userId,
      patientName,
      bloodGroup,
      urgency,
      hospitalName,
       location: {
        ...location, 
        type: "Point", 
      },
      contactNumber,
      whatsappNumber,
      additionalInfo,
    };

    console.log("Data being sent to Service:", bloodRequestData);

    const bloodRequest =
      await bloodRequestService.createBloodRequest(bloodRequestData);
    return response.success(
      res,
      "Blood request created successfully",
      bloodRequest,
    );
  } catch (error) {
    console.error("Error in createBloodRequest:",error);
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

    const updatedRequest = await bloodRequestService.updateBloodRequest(
      id,
      updateData,
    );

    if (!updatedRequest) {
      return response.error(res, "Blood request not found", 404);
    }

    return response.success(
      res,
      "Blood request updated successfully",
      updatedRequest,
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

    const deletedRequest = await bloodRequestService.deleteBloodRequestById(id);

    if (!deletedRequest) {
      return response.error(res, "Blood request not found", 404);
    }

    return response.success(
      res,
      "Blood request deleted successfully",
      deletedRequest,
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

const getMyBloodRequests = async (req, res) => {
  try {
    console.log("Decoded User Data:", req.user);

    const userId = req.user.userId;

    if (!userId) {
      return response.error(res, "User ID not found in token", 401);
    }

    const requests = await bloodRequestService.getRequestsByUserId(userId);
    return response.success(
      res,
      "Your blood requests fetched successfully",
      requests,
    );
  } catch (error) {
    console.error("Error in getMyBloodRequests:", error);
    return response.error(res, "Server error", 500);
  }
};

const activateBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const request = await bloodRequestService.getBloodRequestById(id);
    if (!request) return response.error(res, "Request not found", 404);

    // Security: Check if user owns this request
    if (request.userId.toString() !== userId) {
      return response.error(res, "Unauthorized to update this request", 403);
    }

    const updated = await bloodRequestService.updateRequestStatus(id, "Active");
    return response.success(
      res,
      "Blood request activated successfully",
      updated,
    );
  } catch (error) {
    return response.error(res, "Server error", 500);
  }
};

const deactivateBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const request = await bloodRequestService.getBloodRequestById(id);
    if (!request) return response.error(res, "Request not found", 404);

    // Security: Check if user owns this request
    if (request.userId.toString() !== userId) {
      return response.error(res, "Unauthorized to update this request", 403);
    }

    const updated = await bloodRequestService.updateRequestStatus(
      id,
      "Deactive",
    );
    return response.success(
      res,
      "Blood request deactivated successfully",
      updated,
    );
  } catch (error) {
    return response.error(res, "Server error", 500);
  }
};

const searchBloodRequests = async (req, res) => {
  try {
    const { bloodGroup, urgency, location, hospitalName } = req.query;

    let filters = {};

    if (bloodGroup) filters.bloodGroup = bloodGroup;
    if (urgency) filters.urgency = urgency;

    if (location) {
      filters.location = { $regex: location, $options: "i" };
    }
    if (hospitalName) {
      filters.hospitalName = { $regex: hospitalName, $options: "i" };
    }

    filters.status = "Active";

    const results = await bloodRequestService.searchBloodRequests(filters);

    return response.success(
      res,
      "Search results fetched successfully",
      results,
    );
  } catch (error) {
    console.error("Search Error:", error);
    return response.error(res, "Error while searching blood requests", 500);
  }
};

const getUrgentAndRecentBloodRequests = async (req, res) => {
  try {
    const requests =
      await bloodRequestService.getUrgentAndLast24HoursRequests();

    return response.success(
      res,
      "Urgent & last 24 hours blood requests fetched",
      requests,
    );
  } catch (error) {
    console.error(error);
    return response.error(res, "Server error", 500);
  }
};

module.exports = {
  createBloodRequest,
  getMyBloodRequests,
  updateBloodRequest,
  deleteBloodRequest,
  getAllBloodRequests,
  getBloodRequestById,
  activateBloodRequest,
  deactivateBloodRequest,
  searchBloodRequests,
  getUrgentAndRecentBloodRequests,
};
