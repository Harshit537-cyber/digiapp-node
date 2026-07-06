const express = require("express");
const router = express.Router();
const upload = require('../../middlewares/upload');
const adminAuth = require('../middlewares/adminAuth');
const verifyToken = require("../../middlewares/auth.middlewares");

const { createBanner, getAllBanners, getBannerById, updateBanner, deleteBanner, searchBanners, getAppBanners } = require("../controllers/bannerController");

router.post("/create", adminAuth,upload.single("image"), createBanner);

router.get("/all", adminAuth, getAllBanners);

router.get("/getById/:id", adminAuth, getBannerById);

router.put("/update/:id", adminAuth, upload.single("image"), updateBanner);

router.delete("/delete/:id", adminAuth, deleteBanner);

router.get("/search", adminAuth, searchBanners);

router.get("/app-banners",verifyToken, getAppBanners )

module.exports = router;