const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/verifiedBusinessController');
const adminAuth = require('../middlewares/adminAuth'); 

router.get('/pending', adminAuth, AdminController.getPendingBusinessRequests);
router.get('/approved', adminAuth, AdminController.getApprovedBusinesses);
router.get('/rejected', adminAuth, AdminController.getRejectedBusinesses);
router.get('/details/:id', adminAuth, AdminController.getBusinessDetails);
router.put('/verify/:id', adminAuth, AdminController.verifyBusinessRequest);
router.put('/suspend/:id', adminAuth, AdminController.suspendBusiness);

module.exports = router;