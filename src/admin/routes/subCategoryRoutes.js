const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { createSubcategoryData, getBySubCategory, getDetailById , getSubcategoriesByCategory} = require("../controllers/subCategoryController");
const upload = require("../../middlewares/upload");

const router = express.Router();


router.post("/create", verifyAdmin,upload.single("images", 1), createSubcategoryData);

router.get("/filter", getBySubCategory);

router.get("/subcategories-by-category", getSubcategoriesByCategory);
router.get("/details/:id", getDetailById);

router.put(
    "/:id",
    upload.array("images"),
    categoryController.updateSubcategoryData
);

router.delete(
    "/:id",
    categoryController.deleteSubcategoryData
);

module.exports = router ;