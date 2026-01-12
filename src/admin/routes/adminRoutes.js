const express = require('express');
const router = express.Router();
const { adminLogin, adminRegister,getAllAdmins,updateAdmin,deleteAdmin, getDashboardStats   } = require('../controllers/adminController'); // adminRegister add kiya
const verifyAdmin = require('../middlewares/adminAuth');

// Public Routes
router.post('/register', adminRegister); 
router.post('/login', adminLogin);       
router.get('/all',verifyAdmin , getAllAdmins)

router.put('/update/:id', verifyAdmin, updateAdmin);  

router.delete('/delete/:id', verifyAdmin, deleteAdmin);

router.get('/dashboard', verifyAdmin, (req, res) => {
    res.json({ message: "Welcome to Admin Dashboard" });
});

router.get("/dashboard-stats", getDashboardStats);

module.exports = router;