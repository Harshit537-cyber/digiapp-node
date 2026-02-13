const SavedContent = require('../models/SavedContent');

// --- 1. Toggle Save (Save or Unsave) ---
const toggleSave = async (req, res) => {
  try {
    const { itemId, itemType } = req.body; // itemType: 'Job', 'Business', or 'Item'
    const userId = req.user.userId || req.user.id;

    if (!['Job', 'Business', 'Item'].includes(itemType)) {
      return res.status(400).json({ success: false, message: "Invalid item type" });
    }

    const existing = await SavedContent.findOne({ userId, itemId });

    if (existing) {
      await SavedContent.findByIdAndDelete(existing._id);
      return res.status(200).json({ success: true, message: "Removed from saved list" });
    } else {
      await SavedContent.create({ userId, itemId, itemType });
      return res.status(201).json({ success: true, message: "Saved successfully" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// --- 2. Get All Saved Data (With User ID) ---
const getMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Saara data fetch karke populate karna
    const allSaved = await SavedContent.find({ userId })
      .populate('itemId')
      .lean();

    // Data ko categorize karna
    const result = {
      userId: userId, // <--- Yahan humne userId add kar di hai
      jobs: [],
      businesses: [],
      items: []
    };

    allSaved.forEach(save => {
      if (save.itemId) { 
        if (save.itemType === 'Job') result.jobs.push(save.itemId);
        if (save.itemType === 'Business') result.businesses.push(save.itemId);
        if (save.itemType === 'Item') result.items.push(save.itemId);
      }
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { toggleSave, getMySavedContent };