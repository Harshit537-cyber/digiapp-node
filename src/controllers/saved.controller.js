const SavedContent = require('../models/SavedContent');

// --- 1. Toggle Save (Save or Unsave) ---
const toggleSave = async (req, res) => {
  try {
    const { itemId, itemType } = req.body; 
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



const getMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    
    const allSaved = await SavedContent.find({ userId })
      .populate('itemId')
      .lean();

    
    const result = {
      userId: userId,
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


// --- 3. Search Saved Content ---
const searchMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { searchQuery, itemType } = req.query; 

    // Build initial query for SavedContent
    const savedContentQuery = { userId };
    if (itemType && ['Job', 'Business', 'Item'].includes(itemType)) {
      savedContentQuery.itemType = itemType;
    } else if (itemType && !['Job', 'Business', 'Item'].includes(itemType)) {
        return res.status(400).json({ success: false, message: "Invalid item type for filtering" });
    }

    const allSaved = await SavedContent.find(savedContentQuery)
      .populate('itemId') // Populate the actual item details
      .lean();

    const result = {
      userId: userId,
      jobs: [],
      businesses: [],
      items: []
    };

    const lowerCaseSearchQuery = searchQuery ? searchQuery.toLowerCase() : '';

    allSaved.forEach(save => {
      if (save.itemId) {
        let matchesSearch = true;

        if (lowerCaseSearchQuery) {
          const item = save.itemId;
          const searchFields = [item.title, item.name, item.description, item.category]; 
          matchesSearch = searchFields.some(field =>
            field && typeof field === 'string' && field.toLowerCase().includes(lowerCaseSearchQuery)
          );
        }

        if (matchesSearch) {
          if (save.itemType === 'Job') result.jobs.push(save.itemId);
          if (save.itemType === 'Business') result.businesses.push(save.itemId);
          if (save.itemType === 'Item') result.items.push(save.itemId);
        }
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

module.exports = { toggleSave, getMySavedContent, searchMySavedContent }; 



