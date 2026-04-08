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

module.exports = {getAllItems};