const express = require('express');
const router = express.Router();
const { 
    getAllFullTimeJobs, 
    updateFullTimeJob, 
    deleteFullTimeJob ,
    getFullTimeJobById,
    adminCreateFullTimeJob
} = require('../controllers/fullTimeJobController');



// Admin Auth Middleware (Aapka existing middleware use karenge)
const verifyAdmin = require('../middlewares/adminAuth');
const upload = require('../../middlewares/upload');


router.post('/create', verifyAdmin, upload.array('images', 5), adminCreateFullTimeJob);
// Saari Routes Protected hain (Sirf Admin ke liye)
router.get('/all', verifyAdmin, getAllFullTimeJobs);
router.put('/update/:id', verifyAdmin, updateFullTimeJob);
router.delete('/delete/:id', verifyAdmin, deleteFullTimeJob);
router.get('/:id', verifyAdmin, getFullTimeJobById); 

module.exports = router;