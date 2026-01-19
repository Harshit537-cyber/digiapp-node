const BloodRequest = require("../../models/BloodRequest");

exports.createBloodRequest = async (req, res) => {
    try {
        const newRequest = new BloodRequest(req.body);
        const savedRequest = await newRequest.save();
        res.status(201).json({ 
            success: true, 
            data: savedRequest 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.getAllBloodRequests = async (req, res) => {
    try {
        const requests = await BloodRequest.find().sort({ createdAt: -1 });
        res.status(200).json({ 
            success: true, 
            count: requests.length,
            data: requests 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.getBloodRequestById = async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: "Blood request not found" 
            });
        }
        res.status(200).json({ 
            success: true, 
            data: request 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.updateBloodRequest = async (req, res) => {
    try {
        const updatedRequest = await BloodRequest.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedRequest) {
            return res.status(404).json({ 
                success: false, 
                message: "Blood request not found" 
            });
        }
        res.status(200).json({ 
            success: true, 
            data: updatedRequest 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.deleteBloodRequest = async (req, res) => {
    try {
        const deletedRequest = await BloodRequest.findByIdAndDelete(req.params.id);
        if (!deletedRequest) {
            return res.status(404).json({ 
                success: false, 
                message: "Blood request not found" 
            });
        }
        res.status(200).json({ 
            success: true, 
            message: "Blood request deleted successfully" 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};