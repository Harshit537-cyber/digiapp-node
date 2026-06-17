const express = require("express");
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');
const { createJobsCategory, createJobsSubCategory,getAllJobsCategories, updateJobsCategory, deleteJobsCategory } = require("../controllers/jobsCategoryController");

const router = express.Router();

router.post("/create", adminAuth, upload.single('image'),createJobsCategory);

router.post("/create-subCategory", adminAuth, createJobsSubCategory);

router.get("/getCategoriesByType", adminAuth, getAllJobsCategories);

router.put("/update/:id", adminAuth, upload.single('image'), updateJobsCategory);

router.delete("/delete/:id", adminAuth, deleteJobsCategory)

module.exports = router;