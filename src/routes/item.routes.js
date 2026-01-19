const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');
const verifyToken = require('../middlewares/auth.middlewares');
const upload = require('../middlewares/upload');

// Create Item (Auth Required)
router.post('/post-item', verifyToken, upload.array('images', 5), itemController.postItem);

// Get All Items (Public - No Token Required usually)
router.get('/all', itemController.getAllItems);

// Get Single Item (Public)
router.get('/:id', itemController.getItemById);


router.put('/update/:id', verifyToken, upload.array('images', 5), itemController.updateItem);


router.delete('/delete/:id', verifyToken, itemController.deleteItem);

router.patch('/activate/:id', verifyToken, itemController.activateItem);


router.patch('/deactivate/:id', verifyToken, itemController.deactivateItem);

module.exports = router;