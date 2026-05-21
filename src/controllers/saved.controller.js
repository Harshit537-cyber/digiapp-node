const SavedContent = require('../models/SavedContent');
const Job = require("../models/Job");
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
      let saveData = { userId, itemId, itemType };
      if (itemType === 'Job') {
        const job = await Job.findById(itemId);
        if (!job) {
          return res.status(404).json({ success: false, message: "Job not found" });
        }
        saveData.jobCategory = job.jobCategory;
      }
      await SavedContent.create(saveData);
      return res.status(201).json({ success: true, message: "Saved successfully" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const  getMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const { type, category } = req.query; 

    let filter = { userId };

    if (type === 'Business') {
      filter.itemType = 'Business';
    } 
    else if (type === 'Item') {
      filter.itemType = 'Item';
    }
    else if (type === 'Job') {
      filter.itemType = 'Job';
      if (category) {
        filter.jobCategory = category;
      }
    }

    const savedRecords = await SavedContent.find(filter)
      .populate('itemId') 
      .sort({ createdAt: -1 }) 
      .lean();

    const formattedData = savedRecords
      .filter(record => record.itemId !== null) 
      .map(record => {
        return {
          savedRecordId: record._id,
          itemType: record.itemType,
          jobCategory: record.jobCategory || null,
          ...record.itemId 
        };
      });

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const searchMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { searchQuery, itemType, jobCategory } = req.query;
    const savedContentQuery = { userId };

    if (itemType) {
      savedContentQuery.itemType = itemType;
    }
    
    if (itemType === 'Job' && jobCategory) {
      savedContentQuery.jobCategory = jobCategory;
    }

    const allSaved = await SavedContent.find(savedContentQuery)
      .populate('itemId') 
      .lean();

    const lowerCaseSearch = searchQuery ? searchQuery.toLowerCase() : '';

    const filteredData = allSaved.filter(save => {
      if (!save.itemId) return false;

      if (lowerCaseSearch) {
        const item = save.itemId;
        const searchText = [
          item.title,
          item.name,
          item.jobRole,
          item.details,
          item.description,
          item.companyName,
          save.jobCategory
        ].join(' ').toLowerCase();

        return searchText.includes(lowerCaseSearch);
      }

      return true;
    });

    const result = filteredData.map(save => ({
      savedRecordId: save._id,
      itemType: save.itemType,
      jobCategory: save.jobCategory,
      ...save.itemId,
      savedAt: save.createdAt
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      itemType: itemType || "All",
      data: result
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { toggleSave, getMySavedContent, searchMySavedContent };



