const express = require("express");
const adminAuth = require('../middlewares/adminAuth');
const { createItemCategory ,getAllItemCategories,getItemCategoryById,deleteItemCategory, addItemSubCategory} = require("../controllers/itemsCategoryController");
const router = express.Router();
const upload = require('../../middlewares/upload');


router.post("/create", adminAuth, upload.single('image'), createItemCategory);
router.get("/get-all", adminAuth, getAllItemCategories);
router.get("/get-by-id/:id", adminAuth, getItemCategoryById);
router.delete("/delete/:id", adminAuth,deleteItemCategory );
router.post("/create-subcategory", adminAuth, addItemSubCategory)


module.exports = router;