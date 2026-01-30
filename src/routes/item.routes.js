// const express = require('express');
// const router = express.Router();
// const itemController = require('../controllers/item.controller');
// const verifyToken = require('../middlewares/auth.middlewares');
// const upload = require('../middlewares/upload');


// // ✅ LATEST 10 (PUBLIC)
// router.get("/latest", itemController.getTop10LatestItems);

// router.get('/search', itemController.searchItems);

// router.get('/my-items/search', verifyToken, itemController.searchMyItems);

// router.get('/my-items', verifyToken, itemController.getMyItems);

// // Create Item (Auth Required)
// router.post('/post-item', verifyToken, upload.array('images', 5), itemController.postItem);

// // Get All Items (Public - No Token Required usually)
// router.get('/all', itemController.getAllItems);

// // Get Single Item (Public)
// router.get('/:id', itemController.getItemById);




// router.put('/update/:id', verifyToken, upload.array('images', 5), itemController.updateItem);


// router.delete('/delete/:id', verifyToken, itemController.deleteItem);

// router.patch('/activate/:id', verifyToken, itemController.activateItem);


// router.patch('/deactivate/:id', verifyToken, itemController.deactivateItem);

// module.exports = router;

const express = require('express');
const router = express.Router();

const itemController = require('../controllers/item.controller');
const verifyToken = require('../middlewares/auth.middlewares');
const upload = require('../middlewares/upload');

/* ================= PUBLIC ROUTES ================= */

// Latest 10 active items
router.get('/latest', itemController.getTop10LatestItems);

// All items (with filters, distance, plan, etc.)
router.get('/all', itemController.getAllItems);

// Search items
router.get('/search', itemController.searchItems);

// Get single item
router.get('/:id', itemController.getItemById);


/* ================= AUTH ROUTES ================= */

// Create item (sell / buy / shop)
router.post(
  '/post-item',
  verifyToken,
  upload.array('images', 5),
  itemController.postItem
);

// Update item
router.put(
  '/update/:id',
  verifyToken,
  upload.array('images', 5),
  itemController.updateItem
);

// Delete item
router.delete('/delete/:id', verifyToken, itemController.deleteItem);

// Activate / Deactivate item
router.patch('/activate/:id', verifyToken, itemController.activateItem);
router.patch('/deactivate/:id', verifyToken, itemController.deactivateItem);

// User items
router.get('/my-items', verifyToken, itemController.getMyItems);
router.get('/my-items/search', verifyToken, itemController.searchMyItems);


/* ================= SAVED ITEMS ================= */

// Save any item (sell / buy / shop)
router.post('/save/:itemId', verifyToken, itemController.saveItem);

// Remove saved item
router.delete('/save/:itemId', verifyToken, itemController.unsaveItem);

// Get all saved items of logged-in user
router.get('/saved', verifyToken, itemController.getSavedItems);

module.exports = router;
