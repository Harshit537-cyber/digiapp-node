const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { createSubcategoryData, getBySubCategory, getDetailById } = require("../controllers/subCategoryController");
const upload = require("../../middlewares/upload");

const router = express.Router();


router.post("/create", verifyAdmin,upload.single("images", 1), createSubcategoryData);

router.get("/filter", getBySubCategory);


router.get("/details/:id", getDetailById);

module.exports = router ;