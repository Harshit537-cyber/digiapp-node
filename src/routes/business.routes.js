const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');

// Imports
const upload = require('../middlewares/upload'); 
const verifyToken = require('../middlewares/auth.middlewares'); 


router.get(
  '/user/my-businesses', 
  verifyToken, 
  businessController.getMyBusinesses
);


// 1. POST: Register Business
router.post(
  '/register',
  verifyToken, 
  upload.fields([
    { name: 'businessImages', maxCount: 5 }, 
    { name: 'nationalId', maxCount: 1 },     
    { name: 'ownerImage', maxCount: 1 }      
  ]),
  businessController.registerBusiness
);

// 2. GET: Get All Businesses (Public route rakh sakte hain ya protected)
router.get('/all', businessController.getAllBusinesses);

// 3. GET: Get Business By ID
router.get('/:id', businessController.getBusinessById);

// 4. PUT: Update Business (Token Required + Images Upload Optional)
router.put(
  '/update/:id',
  verifyToken,
  upload.fields([
    { name: 'businessImages', maxCount: 5 }, 
    { name: 'nationalId', maxCount: 1 },     
    { name: 'ownerImage', maxCount: 1 }      
  ]),
  businessController.updateBusiness
);

// 5. DELETE: Delete Business (Token Required)
router.delete('/delete/:id', verifyToken, businessController.deleteBusiness);


router.post(
  '/:id/add-service', 
  verifyToken,
  upload.single('serviceImage'),
  businessController.addServiceToBusiness
);

router.get('/:id/services', businessController.getBusinessServices);

router.delete('/:id/service/:serviceId', verifyToken, businessController.deleteServiceFromBusiness);


router.put(
  '/:id/service/:serviceId', 
  verifyToken,
  upload.single('serviceImage'), 
  businessController.updateServiceInBusiness
);


router.patch(
  '/:id/background-image',
  verifyToken,
  upload.single('backgroundImage'), // 'backgroundImage' field name in Form-Data
  businessController.setBackgroundImage
);

// Remove Background Image
router.delete(
  '/:id/background-image',
  verifyToken,
  businessController.deleteBackgroundImage
);


module.exports = router;