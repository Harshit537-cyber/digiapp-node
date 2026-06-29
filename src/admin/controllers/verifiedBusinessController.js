const businessService = require('../../services/business.services'); 

const getPendingBusinessRequests = async (req, res) => {
    try {
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

const verifyBusinessRequest = async (req, res) => {
    try {
        const { id } = req.params; 
        const { action } = req.body; 

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

const getApprovedBusinesses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await businessService.getBusinessesByStatus('approved', page, limit);

        return res.status(200).json({
            success: true,
            message: "Approved businesses fetched successfully",
            ...result,
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching approved businesses", 
            error: error.message 
        });
    }
};

const getRejectedBusinesses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await businessService.getBusinessesByStatus('rejected', page, limit);

        return res.status(200).json({
            success: true,
            message: "Rejected businesses fetched successfully",
            ...result,
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching rejected businesses", 
            error: error.message 
        });
    }
};

const getBusinessDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const business = await businessService.getBusinessById(id);

        if (!business) {
            return res.status(404).json({ success: false, message: "Business request not found" });
        }

        return res.status(200).json({
            success: true,
            data: business
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching business details", 
            error: error.message 
        });
    }
};

const suspendBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const business = await businessService.updateBusinessStatus(id, 'Suspended');

        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Business suspended successfully",
            data: business
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Error suspending business", 
            error: error.message 
        });
    }
};

module.exports = {  
    getPendingBusinessRequests, 
    verifyBusinessRequest, 
    getApprovedBusinesses,
    getRejectedBusinesses,
    getBusinessDetails,
    suspendBusiness
};