const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');

// Imports
const upload = require('../middlewares/upload'); 
const verifyToken = require('../middlewares/auth.middlewares'); 
const { upgradeBusinessPlan } = require('../controllers/upgradePlanController');


router.get(
  '/user/my-businesses', 
  verifyToken, 
  businessController.getMyBusinesses
);
router.get("/search", businessController.searchBusinesses)

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

router.post("/upgrade-plan", verifyToken, upgradeBusinessPlan);

// 2. GET: Get All Businesses (Public route rakh sakte hain ya protected)
router.get('/all', businessController.getAllBusinesses);
router.get("/get-posted-job", verifyToken, businessController.getMyPostedBusinesses)
router.get("/search-my-businesses", verifyToken, businessController.searchMyBusinesses)
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
  upload.single('backgroundImage'), 
  businessController.setBackgroundImage
);

// Remove Background Image
router.delete(
  '/:id/background-image',
  verifyToken,
  businessController.deleteBackgroundImage
);


router.patch(
  '/:id/service/:serviceId/add-images',
  verifyToken,
  upload.array('serviceImages', 5), 
  businessController.addServiceImages
);


router.delete(
  '/:id/service/:serviceId/remove-image',
  verifyToken,
  businessController.deleteServiceImage
);


router.post('/add-business-service', verifyToken,upload.array('serviceImages', 10), businessController.addBusinessServiceListing);
router.post("/add-gallery-images", verifyToken, upload.array("businessImages", 15), businessController.addGalleryImages);

router.patch(
  '/:id/add-images',
  verifyToken,
  upload.array('businessImages', 10), 
  businessController.addMoreBusinessImages
);


router.delete(
  '/:id/remove-image',
  verifyToken,
  businessController.deleteBusinessImage
);


module.exports = router;