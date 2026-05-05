const express = require('express');
const router = express.Router();
const adminBusinessController = require('../controllers/adminBusinessController');
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload'); 
const verifyAdmin = require('../middlewares/adminAuth');

router.use(adminAuth);

const businessUploadFields = upload.fields([
    { name: 'businessImages', maxCount: 5 },
    { name: 'nationalIdImage', maxCount: 1 },
    { name: 'ownerImage', maxCount: 1 }
]);

const serviceImageUpload = upload.single('serviceImage');

router.post('/create-for-user', businessUploadFields, adminBusinessController.createBusinessByAdmin);
router.get('/all', adminBusinessController.getAllBusiness);
router.get('/:id', adminBusinessController.getBusinessById);
router.put('/update/:id', businessUploadFields, adminBusinessController.updateBusiness);
router.delete('/delete/:id', adminBusinessController.deleteBusiness);
router.patch("/update-status/:id", verifyAdmin,adminBusinessController.updateBusinessStatus)
router.patch('/toggle-status/:id', adminBusinessController.toggleBlockBusiness);

// Example Route
router.post('/add-service/:businessId', upload.single('serviceImage'), adminBusinessController.addServiceToBusiness);
router.put('/update-service/:businessId/:serviceId', serviceImageUpload, adminBusinessController.updateServiceInBusiness);
router.delete('/delete-service/:businessId/:serviceId', adminBusinessController.deleteServiceInBusiness);


router.get('/:businessId/services', adminBusinessController.getBusinessServices);

module.exports = router;