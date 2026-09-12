const Item = require("../../models/Item");
const Admin = require("../../admin/models/Admin")
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const User = require("../../models/User");
const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map(file =>
        cloudinary.uploader.upload(file.path, { folder: "jobs" })
    );
    const results = await Promise.all(uploadPromises);


    files.forEach(file => fs.unlinkSync(file.path));

    return results.map(result => result.secure_url);
};


exports.createItem = async (req, res) => {
    try {
        const body = req.body;
        const userId = req.user.id || req.user.userId; 

        const itemUserId = body.userId || userId;

        const allowedRoles = ["SERVICE_PROVIDER", "BUSINESS_SHOPS", "JOB_SEEKER", "GENERAL_USER"];
        if (body.userId) {
            const targetUser = await User.findById(itemUserId).select("role");
            if (!targetUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            if (!allowedRoles.includes(targetUser.role)) {
                return res.status(400).json({
                    success: false,
                    message: "Item can only be posted for SERVICE_PROVIDER, BUSINESS_SHOPS, JOB_SEEKER, or GENERAL_USER roles"
                });
            }
        }

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = await uploadFilesToCloudinary(req.files);
        }

        const lng = body.location?.coordinates?.[0] || body["location[coordinates][0]"] || 0;
        const lat = body.location?.coordinates?.[1] || body["location[coordinates][1]"] || 0;
        const address = body.location?.address || body["location[address]"] || "";

        let preferredComm = { call: false, chat: false };
        if (body.preferredCommunication) {
            preferredComm = typeof body.preferredCommunication === "string" 
                ? JSON.parse(body.preferredCommunication) 
                : body.preferredCommunication;
        }

        const itemData = {
            title: body.title,
            details: body.details,
            category: body.category,
            subCategory: body.subCategory,
            price: Number(body.price) || 0,
            images: imageUrls,
            location: {
                type: "Point", 
                coordinates: [parseFloat(lng), parseFloat(lat)],
                address: address
            },
            preferredCommunication: {
                call: preferredComm.call === 'true' || preferredComm.call === true,
                chat: preferredComm.chat === 'true' || preferredComm.chat === true
            },
            isActive: body.isActive === 'undefined' ? true : (body.isActive === 'true' || body.isActive === true),
            isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
            user: itemUserId,
            expiryDate: body.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };

        const adminData = await User.findById(userId).select("fullName role");
        // -------------------------------------------------------------------------------

        if (!adminData) {
            return res.status(404).json({ 
                success: false, 
                message: "Admin profile not found" 
            });
        }

        const newItem = await Item.create(itemData);

        const finalResponseData = newItem.toObject();
        finalResponseData.user = adminData; 

        res.status(201).json({
            success: true,
            message: "Item created successfully by Admin",
            postedBy: "ADMIN",
            adminName: adminData.fullName,
            adminRole: adminData.role,
            data: finalResponseData
        });

    } catch (error) {
        console.error("Create Item Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create item",
            error: error.message
        });
    }
};


exports.getAllItems = async (req, res) => {
    try {
        const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const admins = await Admin.find().select("_id name role");
        const adminIds = admins.map(admin => admin._id);

        const adminMap = {};
        admins.forEach(admin => {
            adminMap[admin._id.toString()] = { 
                name: admin.name, 
                role: admin.role 
            };
        });

        let query = { 
            user: { $in: adminIds } 
        };

        if (title) {
            query.title = { $regex: title, $options: "i" };
        }

        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const distanceInKm = parseFloat(radius) || 10;
            const radiusInRadians = distanceInKm / 6378.1;
            query.location = {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInRadians]
                }
            };
        }

        const totalItems = await Item.countDocuments(query);
        const activeCount = await Item.countDocuments({ ...query, isActive: true });
        const featuredCount = await Item.countDocuments({ ...query, isFeatured: true });

        const priceAggregation = await Item.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalPrice: { $sum: "$price" }
                }
            }
        ]);
        const totalSum = priceAggregation.length > 0 ? priceAggregation[0].totalPrice : 0;

        const items = await Item.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const populatedItems = items.map(item => {
            const adminInfo = adminMap[item.user?.toString()];
            return {
                ...item,
                user: adminInfo || { fullName: "Unknown Admin", role: "ADMIN" }
            };
        });

        res.status(200).json({
            success: true,
            totalItems: totalItems,
            activeItems: activeCount,
            featuredItems: featuredCount,
            totalPriceSum: totalSum,
            pagination: {
                totalPages: Math.ceil(totalItems / limitNum),
                currentPage: pageNum,
                pageSize: populatedItems.length
            },
            data: populatedItems
        });

    } catch (error) {
        console.error("Get All Admin Items Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching data",
            error: error.message
        });
    }
};


exports.deleteItem = async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);

        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error deleting item",
            error: error.message
        });
    }
};

exports.getUserCreatedItems = async (req, res) => {
    try {
        const { lat, lng, radius, title, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let query = {};

   
        if (title) {
            query.title = { $regex: title, $options: "i" };
        }

    
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const distanceInKm = parseFloat(radius) || 10;
            const radiusInRadians = distanceInKm / 6378.1;
            query.location = {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInRadians]
                }
            };
        }

        const totalItems = await Item.countDocuments(query);
        const activeCount = await Item.countDocuments({ ...query, isActive: true });
        const isFeaturedCount = await Item.countDocuments({...query, isFeatured: true})
      
        const priceAggregation = await Item.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalPrice: { $sum: "$price" }
                }
            }
        ]);
        const totalSum = priceAggregation.length > 0 ? priceAggregation[0].totalPrice : 0;
 const creditsAggregation = await Item.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalCreditsSpent: { $sum: "$creditsInfo.totalCreditsUsed" }
                }
            }
        ]);
        const totalCreditsSpent = creditsAggregation.length > 0 ? creditsAggregation[0].totalCreditsSpent : 0;
        const items = await Item.find(query)
            .populate("user", "-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // 7. Final Response
        res.status(200).json({
            success: true,
            message: "User created items fetched successfully",
            totalItems: totalItems,
            activeItems: activeCount,
            totalPriceSum: totalSum,
               totalCreditsSpent: totalCreditsSpent,
            isFeatured: isFeaturedCount,
            pagination: {
                totalPages: Math.ceil(totalItems / limitNum),
                currentPage: pageNum,
                pageSize: items.length
            },
            data: items
        });

    } catch (error) {
        console.error("Get User Items Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching user items",
            error: error.message
        });
    }
};



exports.updateItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        const body = req.body;

        let item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        let imageUrls = item.images; 
        if (req.files && req.files.length > 0) {
            const newImages = await uploadFilesToCloudinary(req.files);
            imageUrls = [...imageUrls, ...newImages];
           
        }

        const lng = body.location?.coordinates?.[0] || body["location[coordinates][0]"] || item.location.coordinates[0];
        const lat = body.location?.coordinates?.[1] || body["location[coordinates][1]"] || item.location.coordinates[1];
        const address = body.location?.address || body["location[address]"] || item.location.address;

        let preferredComm = item.preferredCommunication;
        if (body.preferredCommunication) {
            const parsedComm = typeof body.preferredCommunication === "string" 
                ? JSON.parse(body.preferredCommunication) 
                : body.preferredCommunication;
            
            preferredComm = {
                call: parsedComm.call === 'true' || parsedComm.call === true,
                chat: parsedComm.chat === 'true' || parsedComm.chat === true
            };
        }

        const updateData = {
            title: body.title || item.title,
            details: body.details || item.details,
            category: body.category || item.category,
            subCategory: body.subCategory || item.subCategory,
            price: body.price !== undefined ? Number(body.price) : item.price,
            images: imageUrls,
            location: {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)],
                address: address
            },
            preferredCommunication: preferredComm,
            isActive: body.isActive !== undefined ? (body.isActive === 'true' || body.isActive === true) : item.isActive,
            isFeatured: body.isFeatured !== undefined ? (body.isFeatured === 'true' || body.isFeatured === true) : item.isFeatured,
            expiryDate: body.expiryDate || item.expiryDate
        };

        const updatedItem = await Item.findByIdAndUpdate(
            itemId, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        ).populate("user", "fullName role");

        res.status(200).json({
            success: true,
            message: "Item updated successfully",
            data: updatedItem
        });

    } catch (error) {
        console.error("Update Item Error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating item",
            error: error.message
        });
    }
};