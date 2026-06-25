const ItemCategory = require('../models/ItemCategory');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');


exports.createItemCategory = async (req, res) => {
  try {
    const { name, subCategory } = req.body;

    if (!name) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Category image is required"
      });
    }

    const exists = await ItemCategory.findOne({ name });
    if (exists) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "This Item category already exists"
      });
    }

    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: 'item_category_icons'
    });

    const newItemCategory = await ItemCategory.create({
      name,
      image: uploadResponse.secure_url,
      subCategory: subCategory ? (Array.isArray(subCategory) ? subCategory : [subCategory]) : [],
      createdBy: req.user?.id
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: "Item Category created successfully",
      data: newItemCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Create Item Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.searchItemCategory = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' is required"
      });
    }


    const results = await ItemCategory.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { subCategory: { $regex: q, $options: 'i' } } 
      ]
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Search Item Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllItemCategories = async (req, res) => {
  try {
    const categories = await ItemCategory.find({ status: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error("Get All Item Categories Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getItemCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ItemCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Item Category not found"
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteItemCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ItemCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Item Category not found"
      });
    }

    if (category.image) {
      try {
        const publicId = category.image.split('/').pop().split('.')[0];
        const folderName = 'item_category_icons';

        await cloudinary.uploader.destroy(`${folderName}/${publicId}`);
      } catch (cloudinaryErr) {
        console.error("Cloudinary Delete Error:", cloudinaryErr.message);
      }
    }

    await ItemCategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Item Category and its icon deleted successfully"
    });

  } catch (error) {
    console.error("Delete Item Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.updateItemCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    let category = await ItemCategory.findById(id);
    if (!category) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Item Category not found"
      });
    }

    if (req.file) {
      if (category.image) {
        try {
          const publicId = category.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`item_category_icons/${publicId}`);
        } catch (err) {
          console.error("Old Image Delete Error:", err.message);
        }
      }

      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: 'item_category_icons'
      });
      category.image = uploadResponse.secure_url;

      fs.unlinkSync(req.file.path);
    }

    if (name) {
      category.name = name;
    }

    if (status !== undefined) {
      category.status = String(status) === 'true';
    }

    const updatedCategory = await category.save();
    res.status(200).json({
      success: true,
      message: "Item Category updated successfully",
      data: updatedCategory
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Update Item Category Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


//SUBCATEGORY CONTROLLERS 

exports.addItemSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryName } = req.body;
    if (!categoryId || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subCategoryName are required"
      });
    }
    const updatedCategory = await ItemCategory.findByIdAndUpdate(
      categoryId,
      {
        $addToSet: { subCategory: subCategoryName.trim() }
      },
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Item Category not found"
      });
    }
    res.status(200).json({
      success: true,
      message: `Sub-category '${subCategoryName}' added successfully to ${updatedCategory.name}`,
      data: updatedCategory
    });

  } catch (error) {
    console.error("Add Item Sub-Category Error:", error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getAllItemSubCategories = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({ success: false, message: "categoryId is required" });
    }

    const category = await ItemCategory.findById(categoryId).select("subCategory name");

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      categoryName: category.name,
      total: category.subCategory.length,
      data: category.subCategory
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchItemSubCategories = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    } 

    const results = await ItemCategory.find({
      subCategory: { $regex: q, $options: 'i' }
    }).select('name subCategory image');

    const formattedData = results.map(cat => ({
      categoryId: cat._id,
      categoryName: cat.name,
      categoryImage: cat.image,
      matchedSubs: cat.subCategory.filter(sub => 
        sub.toLowerCase().includes(q.toLowerCase())
      )
    }));

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getSingleItemSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryName } = req.query;

    const category = await ItemCategory.findOne(
      {
        _id: categoryId,
        subCategory: { $regex: new RegExp(`^${subCategoryName.trim()}$`, 'i') }
      },
      { "subCategory.$": 1, name: 1 }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: "Sub-category not found" });
    }

    res.status(200).json({
      success: true,
      categoryName: category.name,
      data: category.subCategory[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateItemSubCategory = async (req, res) => {
  try {
    const { categoryId, oldName, newName } = req.body;

    if (!categoryId || !oldName || !newName) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const category = await ItemCategory.findById(categoryId);
    if (category.subCategory.includes(newName.trim())) {
      return res.status(400).json({ success: false, message: "New name already exists" });
    }

    const updatedDoc = await ItemCategory.findOneAndUpdate(
      { _id: categoryId, subCategory: oldName.trim() },
      { $set: { "subCategory.$": newName.trim() } },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: "Sub-category not found to update" });
    }

    res.status(200).json({ success: true, message: "Updated successfully", data: updatedDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteItemSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryName } = req.query;

    const updatedDoc = await ItemCategory.findByIdAndUpdate(
      categoryId,
      { $pull: { subCategory: subCategoryName.trim() } },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: `Sub-category '${subCategoryName}' deleted successfully`,
      data: updatedDoc
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

