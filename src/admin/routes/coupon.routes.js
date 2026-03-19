const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');

router.post('/create', couponController.createCoupon); 
router.get('/list', couponController.getAllCoupons); 
router.get('/track/:id', couponController.getCouponTracker); 

module.exports = router;