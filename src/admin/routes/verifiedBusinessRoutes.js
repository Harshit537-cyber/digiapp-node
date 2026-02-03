const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/verifiedBusinessController');
const adminAuth = require('../middlewares/adminAuth'); 


router.get(
    '/pending', 
    adminAuth,
    AdminController.getPendingBusinessRequests
);


router.put(
    '/verify/:id', 
    adminAuth, // Requires Admin Authentication
    AdminController.verifyBusinessRequest
);

module.exports = router;