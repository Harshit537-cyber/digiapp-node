const express = require('express');

const router = express.Router();
const {
    adminLogin,
    adminRegister,
    getAllAdmins,
    updateAdmin,
    deleteAdmin,
    getDashboardStats,
    getAllUsersForAdmin,
    toggleUserStatus,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getAllJobsForAdmin,
    adminUpdateJob,
    adminDeleteJob,
    displayImage,
    searchAdmins
} = require('../controllers/adminController'); // Correct path relative to adminRoutes.js
const verifyAdmin = require('../middlewares/adminAuth'); // Ensure this path is correct
const upload = require('../../middlewares/upload'); // Correct path relative to adminRoutes.js

// Public Admin Routes (for Admin authentication)
router.post('/register', adminRegister);
router.post('/login', adminLogin);

// Admin Management Routes (Protected by verifyAdmin)
router.get('/all', verifyAdmin, getAllAdmins);
router.put('/update/:id', verifyAdmin, updateAdmin);
router.delete('/delete/:id', verifyAdmin, deleteAdmin);

// Dashboard Routes (Protected by verifyAdmin)
router.get('/dashboard', verifyAdmin, (req, res) => {
    res.json({ message: "Welcome to Admin Dashboard" });
});
router.get("/dashboard-stats", verifyAdmin, getDashboardStats);

// Search Admin

router.get("/search-admin", verifyAdmin, searchAdmins);

// User Management Routes (Protected by verifyAdmin)
router.get('/users', verifyAdmin, getAllUsersForAdmin);
router.patch('/user-status/:id', verifyAdmin, toggleUserStatus);

// --- USER MANAGEMENT APIs (Admin Auth Required, with file uploads) ---
// 'profilePhoto' must match the 'name' attribute of the file input field in your form-data
router.post('/users/create', verifyAdmin, upload.single('profilePhoto'), createUserByAdmin);
router.put('/users/update/:id', verifyAdmin, upload.single('profilePhoto'), updateUserByAdmin);
router.delete('/users/delete/:id', verifyAdmin, deleteUserByAdmin);

// Job Management Routes (Protected by verifyAdmin, with file uploads)
router.get('/jobs', verifyAdmin, getAllJobsForAdmin);
// 'jobImage' must match the 'name' attribute of the file input field in your form-data
router.put('/jobs/update/:id', verifyAdmin, upload.single('jobImage'), adminUpdateJob);
router.delete('/jobs/delete/:id', verifyAdmin, adminDeleteJob);


router.post('/displayimage/:adminId', verifyAdmin,
  upload.array("profilePhoto", 5),
  displayImage
 )

module.exports = router;