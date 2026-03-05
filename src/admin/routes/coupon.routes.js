const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');

// URL: /api/admin/coupon/create
router.post('/create', couponController.createCoupon);

module.exports = router;