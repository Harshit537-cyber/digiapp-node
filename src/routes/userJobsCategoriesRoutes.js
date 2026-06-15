const express = require("express");
const verifyToken = require("../middlewares/auth.middlewares");
const { getAllJobsCategories ,getSubCategoriesByJobCategoryId, getJobsByFilter} = require("../controllers/userJobsCategoriesController");
const router = express.Router();

router.get("/get-all", verifyToken, getAllJobsCategories);

router.get("/sub-categories/filter", verifyToken, getSubCategoriesByJobCategoryId);

router.get("/filter", verifyToken, getJobsByFilter);

module.exports = router;