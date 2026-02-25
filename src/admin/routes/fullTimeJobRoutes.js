const express = require('express');
const router = express.Router();
const verifyAdmin = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');
const { 
    getAllFullTimeJobs, 
    updateFullTimeJob, 
    deleteFullTimeJob,
    getFullTimeJobById,
    adminCreateFullTimeJob
} = require('../controllers/fullTimeJobController');

router.post('/create', verifyAdmin, upload.array('images', 5), adminCreateFullTimeJob);
router.put('/update/:id', verifyAdmin, upload.array('images', 5), updateFullTimeJob); // Added upload here

router.get('/all', verifyAdmin, getAllFullTimeJobs);
router.get('/:id', verifyAdmin, getFullTimeJobById); 
router.delete('/delete/:id', verifyAdmin, deleteFullTimeJob);

module.exports = router;