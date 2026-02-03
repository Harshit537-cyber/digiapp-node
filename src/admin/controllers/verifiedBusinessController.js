// ... existing imports in AdminController.js (e.g., Admin.js, AdminAuth.js)
const businessService = require('../../services/business.services'); // Make sure this is imported

// --- 1. Get All Pending Business Requests ---
const getPendingBusinessRequests = async (req, res) => {
    try {
        // Admin middleware (AdminAuth.js) should protect this route
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await businessService.getPendingBusinesses(page, limit);

        return res.status(200).json({
            success: true,
            message: "Pending business requests fetched successfully",
            ...result,
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching pending businesses", 
            error: error.message 
        });
    }
};

// --- 2. Approve/Reject Business Request ---
const verifyBusinessRequest = async (req, res) => {
    try {
        // Admin middleware (AdminAuth.js) should protect this route
        const { id } = req.params; // Business ID
        const { action } = req.body; // 'approve' or 'reject'

        let newStatus;
        if (action === 'approve') {
            newStatus = 'Approved';
        } else if (action === 'reject') {
            newStatus = 'Rejected';
        } else {
            return res.status(400).json({ success: false, message: "Invalid action. Must be 'approve' or 'reject'." });
        }

        const business = await businessService.updateBusinessStatus(id, newStatus);
        
        if (!business) {
            return res.status(404).json({ success: false, message: "Business request not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Business request ${newStatus.toLowerCase()} successfully`,
            data: business,
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: `Error during business verification (${req.body.action})`, 
            error: error.message 
        });
    }
};

module.exports = {  getPendingBusinessRequests, verifyBusinessRequest };