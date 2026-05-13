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



const getMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;


    const allSaved = await SavedContent.find({ userId })
      .populate('itemId')
      .lean();


    const result = {
      userId: userId,
      jobs: {
        LOCAL_JOB: [],
        PART_TIME_JOB: [],
        FULL_TIME_JOB: []
      },
      businesses: [],
      items: []
    };

    allSaved.forEach(save => {
      if (save.itemId) {
        if (save.itemType === 'Job') {
          const category = save.jobCategory;
          if (result.jobs[category]) {
            result.jobs[category].push(save.itemId);
          } else {
            if (!result.jobs.other) result.jobs.other = [];
            result.jobs.other.push(save.itemId);
          }
        } else if (save.itemType === 'Business') {
          result.businesses.push(save.itemId);
        } else if (save.itemType === 'Item') {
          result.items.push(save.itemId);
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


// --- 3. Search Saved Content ---
const searchMySavedContent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { searchQuery, itemType, jobCategory } = req.query;

    // Build initial query for SavedContent
    const savedContentQuery = { userId };

    if (itemType) {
      if (['Job', 'Business', 'Item'].includes(itemType)) {
        savedContentQuery.itemType = itemType;
      } else {
        return res.status(400).json({ success: false, message: "Invalid item type" });
      }
    }

    if (jobCategory) {
      savedContentQuery.jobCategory = jobCategory;
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
          const searchFields = [
            item.title,
            item.name,
            item.jobRole,
            item.details,
            save.jobCategory,
            item.description,
            item.category,
            item.companyName,
          ];


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



