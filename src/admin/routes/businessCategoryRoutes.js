
const express = require('express');
const router = express.Router();
const categoryCtrl = require('../controllers/businessCategoryController');
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');

router.post(
  '/add',
  adminAuth,
  upload.single('image'),
  categoryCtrl.createCategory
);

router.post("/create-subCategory", adminAuth,categoryCtrl.createSubCategory);

router.get(
  '/all',
  adminAuth,
  categoryCtrl.getAllCategories
);

router.get("/get-by-id/:id", adminAuth, categoryCtrl.getCategoryById);
router.put("/update/:id", adminAuth, upload.single('image'),categoryCtrl.updateBusinessCategory )
// router.delete("/delete-subCategory", adminAuth,categoryCtrl.deleteSubCategory);

// router.get("/dropdown-categories", categoryCtrl.getAllCategoriesForDropdown);
// router.get("/get-subCategories", adminAuth,categoryCtrl.getSubcategoriesBySection);
// router.get("/search-category", adminAuth,categoryCtrl.searchCategory);

// router.put("/update/:id",upload.single('image'), categoryCtrl.updateCategory);

// router.put("/update-subCategory", adminAuth,categoryCtrl.updateSubCategory);



// // Delete category by ID
router.delete(
  '/delete/:id',
  adminAuth,
  categoryCtrl.deleteCategory
);

module.exports = router;
