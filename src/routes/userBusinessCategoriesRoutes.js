const express = require("express");
const verifyToken = require("../middlewares/auth.middlewares");
const { getAllCategoriesForUsers,getSubCategoriesByCategoryId ,getBusinessesBySubCategory } = require("../controllers/userBusinessCategoriesController");
const router = express.Router();


router.get("/get-all-categories", verifyToken, getAllCategoriesForUsers);
router.get("/getSubCategoriesByCategoryId/:categoryId", verifyToken, getSubCategoriesByCategoryId);
router.get("/BusinessesBySubCategory/filter", verifyToken, getBusinessesBySubCategory )
module.exports = router;