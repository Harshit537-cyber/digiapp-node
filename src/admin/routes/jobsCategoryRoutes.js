const express = require("express");
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');
const { createJobsCategory, createJobsSubCategory,getAllJobsCategories } = require("../controllers/jobsCategoryController");

const router = express.Router();

router.post("/create", adminAuth, upload.single('image'),createJobsCategory);

router.post("/create-subCategory", adminAuth, createJobsSubCategory);

router.get("/getCategoriesByType", adminAuth, getAllJobsCategories);



module.exports = router;