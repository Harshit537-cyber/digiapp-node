const express = require('express');
const router = express.Router();
const { adminLogin, adminRegister, getAllAdmins, updateAdmin, deleteAdmin, getDashboardStats, getAllUsersForAdmin, toggleUserStatus, getAllJobsForAdmin, adminUpdateJob, adminDeleteJob } = require('../controllers/adminController'); // adminRegister add kiya
const verifyAdmin = require('../middlewares/adminAuth');

// Public Routes
router.post('/register', adminRegister);
router.post('/login', adminLogin);
router.get('/all', verifyAdmin, getAllAdmins)

router.put('/update/:id', verifyAdmin, updateAdmin);

router.delete('/delete/:id', verifyAdmin, deleteAdmin);

router.get('/dashboard', verifyAdmin, (req, res) => {
    res.json({ message: "Welcome to Admin Dashboard" });
});

//For dashboard
router.get("/dashboard-stats", verifyAdmin, getDashboardStats);

router.get('/users', verifyAdmin, getAllUsersForAdmin);
router.patch('/user-status/:id', verifyAdmin, toggleUserStatus);


// ---------------------------


// Saari jobs fetch karne ke liye (Table me dikhane ke liye)
router.get('/jobs', verifyAdmin, getAllJobsForAdmin);

// Kisi specific job ko edit karne ke liye
router.put('/job/update/:id', verifyAdmin, adminUpdateJob);

// Kisi specific job ko delete karne ke liye
router.delete('/job/delete/:id', verifyAdmin, adminDeleteJob);


module.exports = router;