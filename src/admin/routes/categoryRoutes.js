const express = require('express');
const router = express.Router();
const categoryCtrl = require('../controllers/categoryController'); 
const adminAuth = require('../middlewares/adminAuth'); // Aapka middleware
const upload = require('../../middlewares/upload');

// POST route par adminAuth add kiya gaya hai
router.post('/add', adminAuth, upload.single('image'), categoryCtrl.createCategory);

router.get('/all', adminAuth, categoryCtrl.getAllCategories); 
router.delete('/delete/:id', adminAuth, categoryCtrl.deleteCategory);

module.exports = router;