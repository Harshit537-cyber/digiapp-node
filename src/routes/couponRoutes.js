const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const verifyAdmin = require("../admin/middlewares/adminAuth");
const verifyToken = require("../middlewares/auth.middlewares");


router.post("/redeem",verifyToken,couponController.redeemCouponUser);

router.post("/admin/create", verifyAdmin ,couponController.createCoupon);
router.get("/admin/all",  verifyAdmin , couponController.getAllCoupons);
router.put("/update-coupon/:id", verifyAdmin, couponController.updateCoupon);
router.get("/admin/track/:id", verifyAdmin , couponController.getCouponTracker);
router.get("/available", verifyToken, couponController.getAvailableCoupons);
router.get("/get-by-id/:id", verifyAdmin, couponController.getCouponById);
router.get("/search-coupon", verifyAdmin, couponController.searchCoupons);
router.delete("/delete/:id", verifyAdmin, couponController.deleteCoupon);

router.patch("/admin/activate/:id", verifyAdmin, couponController.activateCoupon);
router.patch("/admin/deactivate/:id", verifyAdmin, couponController.deactivateCoupon);


module.exports = router;