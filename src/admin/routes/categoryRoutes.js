
const express = require('express');
const router = express.Router();

const categoryCtrl = require('../controllers/categoryController');
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');

/*
|--------------------------------------------------------------------------
| CATEGORY ROUTES
|--------------------------------------------------------------------------
*/

// Create category (jobs / sale / shop)
router.post(
  '/add',
  adminAuth,
  upload.single('image'),
  categoryCtrl.createCategory
);

router.post("/create-subCategory", adminAuth,categoryCtrl.createSubCategory);

// Get all categories OR filter by type
// Example: /all?type=jobs
router.get(
  '/all',
  adminAuth,
  categoryCtrl.getAllCategories
);


// Delete category by ID
router.delete(
  '/delete/:id',
  adminAuth,
  categoryCtrl.deleteCategory
);

module.exports = router;
