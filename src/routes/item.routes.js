const express = require('express');
const router = express.Router();

const itemController = require('../controllers/item.controller');
const verifyToken = require('../middlewares/auth.middlewares');
const upload = require('../middlewares/upload');

/* ================= PUBLIC ROUTES ================= */
router.get('/latest', itemController.getTop10LatestItems);
router.get('/all', itemController.getAllItems);     // static route
// router.get('/', itemController.getAllItems);        // optional (same controller)




router.get('/search', itemController.searchItems);

/* ================= AUTH ROUTES ================= */
router.get('/my-items', verifyToken, itemController.getMyItems);
router.get('/my-items/search', verifyToken, itemController.searchMyItems);
router.get("/geCategories", verifyToken, itemController.getCategoriesData)

router.get("/search/save-Items", verifyToken, itemController.searchSavedItems)
router.get('/saved-items', verifyToken, itemController.getSavedItems);
router.get("/nearby-items", verifyToken, itemController.getNearbyItemsLists)


router.post('/save/:itemId', verifyToken, itemController.saveItem);
router.delete('/unsave/:itemId', verifyToken, itemController.unsaveItem);

router.post(
  '/post-item',
  verifyToken,
  upload.array('images', 3),
  itemController.postItem
);

router.put(
  '/update/:id',
  verifyToken,
  upload.array('images', 3),
  itemController.updateItem
);

router.delete('/delete/:id', verifyToken, itemController.deleteItem);
router.patch('/activate/:id', verifyToken, itemController.activateItem);
router.patch('/deactivate/:id', verifyToken, itemController.deactivateItem);

/* ================= DYNAMIC ROUTE (ALWAYS LAST) ================= */
router.get('/:id', itemController.getItemById);     // ALWAYS last

module.exports = router;
