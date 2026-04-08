const Item = require("../../models/Item");

const getAllItems = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const items = await Item.find({})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);

        const total = await Item.countDocuments({});

        res.status(200).json({
            success: true,
            totalItems: total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching data",
            error: error.message
        });
    }
};

const updateItem = async (req, res) => {
    try {
        const { title, category, price, isActive, isFeatured } = req.body;

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id, 
            { 
                title, 
                category, 
                price, 
                isActive, 
                isFeatured 
            }, 
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item updated successfully",
            data: updatedItem
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Update failed",
            error: error.message
        });
    }
};

module.exports = {getAllItems, updateItem};