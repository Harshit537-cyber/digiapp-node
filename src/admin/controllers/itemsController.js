const Item = require("../../models/Item");

const createItem = async (req, res) => {
    try {
       
        const { 
            title, 
            price, 
            category, 
            isActive, 
            isFeatured,
            details, 
            user, 
            location 
        } = req.body;

        const newItem = new Item({
            title,
            price,
            category,
            isActive,
            isFeatured,
            details,   
            user,      
            location   
        });

        // Save to database
        const savedItem = await newItem.save();

        res.status(201).json({
            success: true,
            message: "Item created successfully",
            data: savedItem
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Failed to create item",
            error: error.message
        });
    }
};


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
        const activeCount = await Item.countDocuments({ isActive: true });
        const featuredCount = await Item.countDocuments({ isFeatured: true });
        const priceAggregation = await Item.aggregate([
            {
                $group: {
                    _id: null,
                    totalPrice: { $sum: "$price" }
                }
            }
        ]);

        const totalSum = priceAggregation.length > 0 ? priceAggregation[0].totalPrice : 0;
        res.status(200).json({
            success: true,
            totalItems: total,
            activeItems: activeCount,        
            featuredItems: featuredCount,    
            totalPriceSum: totalSum, 
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


const deleteItem = async (req, res) => {
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


module.exports = {getAllItems, updateItem, deleteItem, createItem};