const express = require("express");
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');
const { createJobsCategory, createJobsSubCategory,getAllJobsCategories, updateSubCategory,deleteSubCategory ,updateJobsCategory, deleteJobsCategory, searchJobsCategories,getSingleSubCategoryById ,getAllSubCategoriesByCategory} = require("../controllers/jobsCategoryController");

const router = express.Router();

router.post("/create", adminAuth, upload.single('image'),createJobsCategory);

router.post("/create-subCategory", adminAuth, createJobsSubCategory);

router.get("/getCategoriesByType", adminAuth, getAllJobsCategories);

router.put("/update/:id", adminAuth, upload.single('image'), updateJobsCategory);

router.get("/search", adminAuth, searchJobsCategories)

router.delete("/delete/:id", adminAuth, deleteJobsCategory);

router.get("/get-subcategory-byId/:categoryId/:subCategoryName", adminAuth, getSingleSubCategoryById);

router.get("/getAll-subCategories/:categoryId", adminAuth, getAllSubCategoriesByCategory);

router.delete("/delete-subCategory", adminAuth, deleteSubCategory );

router.put("/update-subCategory", adminAuth, updateSubCategory)

module.exports = router;