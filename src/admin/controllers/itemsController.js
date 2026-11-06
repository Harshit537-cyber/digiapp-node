const mongoose = require("mongoose");
const Item = require("../../models/Item");
const Admin = require("../../admin/models/Admin");
const ItemCategory = require("../models/ItemCategory");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const User = require("../../models/User");

const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    const urls = [];
    for (const file of files) {
        try {
            const result = await cloudinary.uploader.upload(file.path, { folder: "items" });
            urls.push(result.secure_url);
        } finally {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
    }
    return urls;
};


exports.createItem = async (req, res) => {
    try {
        const body = req.body;
        const userId = req.user.id || req.user.userId;

        const itemUserId = body.userId || userId;

        // 1. Basic validation
        if (!body.title || !body.details) {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(400).json({
                success: false,
                message: "Title and details are required"
            });
        }

        const categoryInput = body.category || body.categoryId;
        if (!categoryInput) {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(400).json({
                success: false,
                message: "Category ID (category) is required"
            });
        }

        if (!body.subCategory) {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(400).json({
                success: false,
                message: "subCategory is required"
            });
        }

        // 2. Validate Category ID (with name fallback)
        let categoryDoc = null;
        if (mongoose.Types.ObjectId.isValid(categoryInput)) {
            categoryDoc = await ItemCategory.findById(categoryInput);
        }
        if (!categoryDoc) {
            categoryDoc = await ItemCategory.findOne({
                name: { $regex: new RegExp(`^${categoryInput.toString().trim().replace(/\r/g, '')}$`, 'i') }
            });
        }

        if (!categoryDoc) {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(404).json({
                success: false,
                message: "Item Category not found with provided ID or name"
            });
        }

        // 3. Validate SubCategory belongs to Category (handling carriage returns and case)
        const cleanSubCategory = (body.subCategory || "").toString().trim().replace(/\r/g, '');
        const matchedSubCategory = categoryDoc.subCategory.find(
            s => s.toString().trim().replace(/\r/g, '').toLowerCase() === cleanSubCategory.toLowerCase()
        );

        if (!matchedSubCategory) {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(400).json({
                success: false,
                message: `SubCategory '${body.subCategory}' does not belong to category '${categoryDoc.name}'`
            });
        }

        // 4. Role check if creating on behalf of specific user
        const allowedRoles = ["SERVICE_PROVIDER", "BUSINESS_SHOPS", "JOB_SEEKER", "GENERAL_USER"];
        let targetUser = null;
        if (body.userId) {
            targetUser = await User.findById(itemUserId).select("fullName role email mobileNumber");
            if (!targetUser) {
                if (req.files && req.files.length > 0) {
                    req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
                }
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            if (!allowedRoles.includes(targetUser.role)) {
                if (req.files && req.files.length > 0) {
                    req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
                }
                return res.status(400).json({
                    success: false,
                    message: "Item can only be posted for SERVICE_PROVIDER, BUSINESS_SHOPS, JOB_SEEKER, or GENERAL_USER roles"
                });
            }
        }

        // 5. Admin profile fetch
        let adminData = await Admin.findById(userId).select("name email role");
        if (!adminData) {
            adminData = await User.findById(userId).select("fullName role");
        }
        if (!adminData) {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(404).json({
                success: false,
                message: "Admin profile not found"
            });
        }

        // 6. Upload images to Cloudinary after all validations succeed
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = await uploadFilesToCloudinary(req.files);
        }

        // 7. Parse location
        let lng = 0;
        let lat = 0;
        let address = "";

        if (body.location) {
            let loc = body.location;
            if (typeof loc === "string") {
                try { loc = JSON.parse(loc); } catch (e) {}
            }
            if (loc && loc.coordinates && Array.isArray(loc.coordinates)) {
                lng = loc.coordinates[0];
                lat = loc.coordinates[1];
            }
            if (loc && loc.address) address = loc.address;
        }

        if (!lng && !lat) {
            lng = body.longitude || body.lng || body["location[coordinates][0]"] || 0;
            lat = body.latitude || body.lat || body["location[coordinates][1]"] || 0;
        }
        if (!address) {
            address = body.address || body["location[address]"] || "";
        }

        let preferredComm = { call: false, chat: false };
        if (body.preferredCommunication) {
            preferredComm = typeof body.preferredCommunication === "string"
                ? JSON.parse(body.preferredCommunication)
                : body.preferredCommunication;
        }

        const itemData = {
            title: body.title.toString().trim(),
            details: body.details.toString().trim(),
            category: categoryDoc._id,
            subCategory: matchedSubCategory,
            price: Number(body.price) || 0,
            images: imageUrls,
            location: {
                type: "Point",
                coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
                address: address
            },
            preferredCommunication: {
                call: preferredComm.call === 'true' || preferredComm.call === true,
                chat: preferredComm.chat === 'true' || preferredComm.chat === true
            },
            isActive: body.isActive === undefined ? true : (body.isActive === 'true' || body.isActive === true),
            isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
            user: itemUserId,
            expiryDate: body.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };

        const newItem = await Item.create(itemData);

        const populatedItem = await Item.findById(newItem._id)
            .populate("category", "name")
            .populate("user", "fullName role email mobileNumber")
            .lean();

        const finalResponseData = {
            ...populatedItem,
            user: populatedItem.user || targetUser || adminData
        };

        res.status(201).json({
            success: true,
            message: "Item created successfully by Admin",
            postedBy: "ADMIN",
            adminName: adminData.name || adminData.fullName,
            adminRole: adminData.role,
            data: finalResponseData
        });

    } catch (error) {
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        }
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
            .populate("category", "name")
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
        const isFeaturedCount = await Item.countDocuments({ ...query, isFeatured: true })

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
            .populate("category", "name")
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
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            }
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        // Validate Category if provided
        let targetCategoryId = item.category;
        let targetCategoryDoc = null;
        const categoryInput = body.category || body.categoryId;

        if (categoryInput) {
            if (mongoose.Types.ObjectId.isValid(categoryInput)) {
                targetCategoryDoc = await ItemCategory.findById(categoryInput);
            }
            if (!targetCategoryDoc) {
                targetCategoryDoc = await ItemCategory.findOne({
                    name: { $regex: new RegExp(`^${categoryInput.toString().trim().replace(/\r/g, '')}$`, 'i') }
                });
            }
            if (!targetCategoryDoc) {
                if (req.files && req.files.length > 0) {
                    req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
                }
                return res.status(404).json({
                    success: false,
                    message: "Item Category not found"
                });
            }
            targetCategoryId = targetCategoryDoc._id;
        }

        // Validate SubCategory if provided (against new or existing category)
        let subCategoryVal = item.subCategory;
        if (body.subCategory) {
            if (!targetCategoryDoc) {
                targetCategoryDoc = await ItemCategory.findById(targetCategoryId);
            }
            if (targetCategoryDoc) {
                const cleanSub = body.subCategory.toString().trim().replace(/\r/g, '');
                const matchedSub = targetCategoryDoc.subCategory.find(
                    s => s.toString().trim().replace(/\r/g, '').toLowerCase() === cleanSub.toLowerCase()
                );
                if (!matchedSub) {
                    if (req.files && req.files.length > 0) {
                        req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
                    }
                    return res.status(400).json({
                        success: false,
                        message: `SubCategory '${body.subCategory}' does not belong to category '${targetCategoryDoc.name}'`
                    });
                }
                subCategoryVal = matchedSub;
            }
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
            title: body.title !== undefined ? body.title.toString().trim() : item.title,
            details: body.details !== undefined ? body.details.toString().trim() : item.details,
            category: targetCategoryId,
            subCategory: subCategoryVal,
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
        )
            .populate("user", "fullName role")
            .populate("category", "name");

        res.status(200).json({
            success: true,
            message: "Item updated successfully",
            data: updatedItem
        });

    } catch (error) {
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        }
        console.error("Update Item Error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating item",
            error: error.message
        });
    }
};