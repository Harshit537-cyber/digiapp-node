const Category = require('../admin/models/Category');

exports.getAppCategories = async (req, res) => {
    try {
        const categories = await Category.find({ status: true });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};