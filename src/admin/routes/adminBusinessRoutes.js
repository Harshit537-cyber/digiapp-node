const express = require('express');
const router = express.Router();
const adminBusinessController = require('../controllers/adminBusinessController');
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload'); 


router.use(adminAuth);

// Middleware for handling business creation/update file fields
const businessUploadFields = upload.fields([
    { name: 'businessImages', maxCount: 5 },
    { name: 'nationalIdImage', maxCount: 1 },
    { name: 'ownerImage', maxCount: 1 }
]);

// Middleware for handling a single service image upload
const serviceImageUpload = upload.single('serviceImage'); // 'serviceImage' is the field name

// --- Business CRUD Routes ---
router.post('/create-for-user', businessUploadFields, adminBusinessController.createBusinessByAdmin);
router.get('/all', adminBusinessController.getAllBusiness);
router.get('/:id', adminBusinessController.getBusinessById);
router.put('/update/:id', businessUploadFields, adminBusinessController.updateBusiness);
router.delete('/delete/:id', adminBusinessController.deleteBusiness);

// --- Business Action Routes ---
router.patch('/toggle-status/:id', adminBusinessController.toggleBlockBusiness);

// --- (UPDATED) Service Route ---
// The route now uses the 'serviceImageUpload' middleware to handle the file
router.post('/add-service/:businessId', serviceImageUpload, adminBusinessController.addServiceToBusiness);

module.exports = router;