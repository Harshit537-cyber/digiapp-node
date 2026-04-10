const BloodRequest = require("../../models/BloodRequest");

exports.createBloodRequest = async (req, res) => {
    try {
        const { userId, adminId, lat, lng, address, ...otherData } = req.body;

        if (!userId && !adminId) {
            return res.status(400).json({ 
                success: false, 
                message: "Provide either userId or adminId" 
            });
        }

        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                message: "Latitude and Longitude are required" 
            });
        }

        const location = {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
            address: address || ""
        };

        const newRequest = new BloodRequest({
            ...otherData,
            userId: userId || null,
            adminId: adminId || null,
            location
        });

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
        const { userId, adminId, lat, lng, address, ...otherData } = req.body;
        let updatePayload = { ...otherData };

        if (userId) updatePayload.userId = userId;
        if (adminId) updatePayload.adminId = adminId;

        if (lat && lng) {
            updatePayload.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)],
                address: address || ""
            };
        }

        const updatedRequest = await BloodRequest.findByIdAndUpdate(
            req.params.id,
            updatePayload,
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



exports.getBloodRequestsByUrgency = async (req, res) => {
    try {
        const { urgency } = req.query;

        
        if (!urgency) {
            return res.status(400).json({
                success: false,
                message: "Please provide an urgency level (Low, Medium, or Critical)"
            });
        }

       
        const requests = await BloodRequest.find({
            urgency: { $regex: new RegExp(`^${urgency}$`, "i") }
        });

        // 4. Return the data
        res.status(200).json({
            success: true,
            results: requests.length,
            data: requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching data",
            error: error.message
        });
    }
};

exports.getNearbyBloodRequests = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query; 

        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide lat and lng" 
            });
        }

      
        const distanceInKm = radius ? parseFloat(radius) : 3;
        const distanceInMeters = distanceInKm * 1000;
        const requests = await BloodRequest.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: distanceInMeters 
                }
            }
        });

        res.status(200).json({
            success: true,
            count: requests.length,
            radius_km: distanceInKm,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};