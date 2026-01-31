
// const express = require('express');
// const router = express.Router();

// const itemController = require('../controllers/item.controller');
// const verifyToken = require('../middlewares/auth.middlewares');
// const upload = require('../middlewares/upload');

// /* ================= PUBLIC ROUTES ================= */

// // Latest 10 active items
// router.get('/latest', itemController.getTop10LatestItems);

// // All items
// router.get('/all', itemController.getAllItems);

// // Search items
// router.get('/search', itemController.searchItems);


// /* ================= AUTH ROUTES ================= */

// // My items
// router.get('/my-items', verifyToken, itemController.getMyItems);
// router.get('/my-items/search', verifyToken, itemController.searchMyItems);

// // Saved items
// router.get('/saved', verifyToken, itemController.getSavedItems);

// // Save item
// router.post('/save/:itemId', verifyToken, itemController.saveItem);

// // Unsave item
// router.delete('/save/:itemId', verifyToken, itemController.unsaveItem);

// // Create item
// router.post(
//   '/post-item',
//   verifyToken,
//   upload.array('images', 5),
//   itemController.postItem
// );

// // Update item
// router.put(
//   '/update/:id',
//   verifyToken,
//   upload.array('images', 5),
//   itemController.updateItem
// );

// // Delete item
// router.delete('/delete/:id', verifyToken, itemController.deleteItem);

// // Activate / Deactivate
// router.patch('/activate/:id', verifyToken, itemController.activateItem);
// router.patch('/deactivate/:id', verifyToken, itemController.deactivateItem);


// /* ================= DYNAMIC ROUTE (LAST) ================= */

// // Single item by id (⚠️ ALWAYS LAST)
// router.get('/:id', itemController.getItemById);

// module.exports = router;
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

router.get("/search/save-Items", verifyToken, itemController.searchSavedItems)
router.get('/saved-items', verifyToken, itemController.getSavedItems);
router.post('/save/:itemId', verifyToken, itemController.saveItem);
router.delete('/save/:itemId', verifyToken, itemController.unsaveItem);

router.post(
  '/post-item',
  verifyToken,
  upload.array('images', 5),
  itemController.postItem
);

router.put(
  '/update/:id',
  verifyToken,
  upload.array('images', 5),
  itemController.updateItem
);

router.delete('/delete/:id', verifyToken, itemController.deleteItem);
router.patch('/activate/:id', verifyToken, itemController.activateItem);
router.patch('/deactivate/:id', verifyToken, itemController.deactivateItem);

/* ================= DYNAMIC ROUTE (ALWAYS LAST) ================= */
router.get('/:id', itemController.getItemById);     // ALWAYS last

module.exports = router;
