const express = require('express');
const router = express.Router();
const savedController = require('../controllers/saved.controller');
const verifyToken = require('../middlewares/auth.middlewares'); 


router.post('/toggle-save', verifyToken, savedController.toggleSave);


router.get('/my-saved', verifyToken, savedController.getMySavedContent);

module.exports = router;