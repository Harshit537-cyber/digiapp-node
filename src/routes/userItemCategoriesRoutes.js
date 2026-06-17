const express = require("express");
const verifyToken = require("../middlewares/auth.middlewares");
const { getAllItemCategoriesForUsers,getSubCategoriesByItemId ,getItemsByFilter} = require("../controllers/userItemCategoriesController");

const router = express.Router();

router.get("/get-all", verifyToken, getAllItemCategoriesForUsers);

router.get("/get-subCategory/:categoryId", verifyToken, getSubCategoriesByItemId);

router.get("/items-filter", verifyToken, getItemsByFilter)

module.exports = router;