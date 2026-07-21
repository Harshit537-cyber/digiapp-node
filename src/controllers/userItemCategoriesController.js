const ItemCategory = require("../admin/models/ItemCategory");
const Item = require("../models/Item");
const mongoose = require("mongoose")


exports.getAllItemCategoriesForUsers = async (req, res) => {
  try {
    const categories = await ItemCategory.find()
      .select('name image subCategory') 
      .sort({ name: 1 });

    if (!categories || categories.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No categories found",
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error("Get All Item Categories Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getSubCategoriesByItemId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const categoryData = await ItemCategory.findOne({ 
      _id: categoryId, 
      status: true 
    }).select('name subCategory image');

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "Item Category not found or is inactive"
      });
    }

    res.status(200).json({
      success: true,
      categoryName: categoryData.name,
      subCategories: categoryData.subCategory 
    });

  } catch (error) {
    console.error("Get Item Sub-Categories Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getItemsByFilter = async (req, res) => {
  try {
    const sanitizedQuery = {};
    Object.keys(req.query).forEach((key) => {
      sanitizedQuery[key.trim()] = req.query[key].trim();
    });

    const { categoryId, subCategory } = sanitizedQuery;
    if (!categoryId || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "Both categoryId and subCategory name are required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId format",
      });
    }

    const query = {
      isActive: true,
      category: new mongoose.Types.ObjectId(categoryId),
      subCategory: { $regex: `^${subCategory}$`, $options: "i" },
      expiryDate: { $gt: new Date() },
    };

    const items = await Item.find(query)
      .populate("category", "name")
      .populate("user", "name mobileNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Filter Items Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



// {
//   "type": "service_account",
//   "project_id": "digi-app-f2dee",
//   "private_key_id": "317db55b9095022a30b7c385d185250f38b981c0",
//   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC8yfJMcUKVJDto\nYNiroKaCVeg/URqA3LLQwrORsqRvErQqUeHhmBaSpvN5Ejc3YvrJzqMSPH67ij3/\nYedJa8xK28AcslIaYzZj7ZqyjwixlkLPWA0OYm7eWB9eGJjS8n5QEvdFKPwDznum\nzCZdq0qWi9PugXrdimqi67iG7oUHGPuVafI5CSejQ/9F+rgkX/q3p4QSOZbsm2MB\ncLBeNSbpoi63vzAAeIjyv9ZVTes7DM0kjMXVqsEqi0LN3MSg3jvTA/RKBjNzzeiJ\nSLXLfrF/X4QSciTJBHWsKABL57UI0ieQiPwjk5Sw1rKLfqmkqTDrLmLpXYXtKDi+\nI/UIL1Z1AgMBAAECggEAGRE/iQLo8mCzOrLRUkisk1XQ1sdwG3gyjiGsMkZkKxNy\ntMPWmFvXc3WTkpnmlwYfgrhbUsqRkVlTzhsz2L3ljHMNWUIcQMC3siEUj20KnHn1\nOQ7Z/PT4/7D3yUi+0hO8zekWyCoe/GpoZMdquLlL2B2M8Hhk1hHRAv0FrXTyWPSv\nZRRPB1B9bPZv69TXzj4Bqmrx41iivUhEu22CeET4NxGb6w5FEz1rAPTOr44cxtqx\nK9XvgwqjBpr7KkCaGrKcvzzlu2h4F2ifexuJ86oGN7l44utU2GFHf/seI6I5syyi\nB1EuuDncPiRDMNBHsrRWmt4GMkk/k3ZEvU34aiZgqQKBgQD6F2HIIy31p95Dk+nI\naSAqg6iZ9Oacujx7DHMxreN1DkJLpA8PXuGcyPoONoPkg3EHxUwgvHRTdAfRkhQP\nTe4zK6UFUJM5DFfvnSjSZb+bkGTCCm72wgccyvr3B4ZG+8JnmzYqcGrz8YMH5Ecr\nhq0yQoGXV+7Poy2n916upsxHLwKBgQDBP8p//6FHHuFS5h1Ni2uXPIJY9HnOqOXR\nqqwCMjBg9HG+lBCdysLOyt+9SJlMpWJ2g9EM27k4qgovmAwgBCI89t7CA5AtEQIY\nlam2Wgne/LKbEdTw2GMUeU9zzITPgLmx1sBfZZgrTv317tZHXqUr7Y39+3khWfyt\ngGFvzFRTmwKBgQCqlZROzSAmNZB3i8akuoAEP7Wa/d7m/GkQjVdthWxmhYlWytqy\n40cEiFl3pFumXLmWUU8x7RlzauuCWR9xqPhW0uhGjcU93luExy/3AwwE8iKn8DHs\nAkCTtSglo25FsKfTv5zcqb1qE0wK7/xThhNQ+ugl8Qalfmo/7Y0ZmBAyZQKBgCRN\n76UMSSgrTPld8bNXtea7n2FGzHtej45MGfRvqVcNlTDQcC60oNRomI/ey63yhATv\nzp4zySA0EaXPUrfRDv2VA1Q/hx5wS4yC0VdIowIZRxSKzQ5SGIsIHz0J9wlkjX4z\ncgB5/ZRlSqChNfBCf5U5E6vbSm5RkX6m16dBI7ZxAoGAHf4oBLhRDGKWViv+vL+T\n7BL5pFt/I92cHBMgWUlZkSlnx2ktPXaBXdUv0qPkKZA6CmVBA7lnyvllv/pAOC56\nKsfUmPVZyFvfMWp2TIFVDr53If5OhlDl4oCIgVwKqeX2x3OhtBcfSyvPFYJHqS5l\nvmlmRMXMETtjbEGy0g/88qA=\n-----END PRIVATE KEY-----\n",
//   "client_email": "firebase-adminsdk-fbsvc@digi-app-f2dee.iam.gserviceaccount.com",
//   "client_id": "110666332469088073898",
//   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//   "token_uri": "https://oauth2.googleapis.com/token",
//   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40digi-app-f2dee.iam.gserviceaccount.com",
//   "universe_domain": "googleapis.com"
// }