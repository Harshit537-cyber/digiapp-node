
const router = require("express").Router();

const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");
const userController = require("../controllers/user.controller");
const cat = require("../controllers/category.controller");
const verifyAdmin = require("../admin/middlewares/adminAuth");

// -------------------- USER ROUTES --------------------

router.get('/dispplay-Image', userController.homeScreenImages)

router.post('/apply-coupon', verifyToken, userController.applyCoupon);

router.post("/update-fcm-token", verifyToken, userController.updateFCMToken);



router.get("/plan-by-id/:planId", verifyToken, userController.getPlanById)

// router.post("/test-notification", verifyToken, userController.sendNotificationTest)
router.get("/all-plans", verifyToken, userController.getPlansForUser);
router.get('/wallet', verifyToken, userController.getWalletDetails);


router.get('/available-coupons', verifyToken, userController.getAvailableCoupons);


// Register new user (profile photo + location)
router.post(
  "/register",
  upload.single("profilePhoto"),
  userController.register
);

router.post("/firebase-auth", userController.verifyOTP);

router.post("/update-fcm-token", verifyToken, userController.updateFCMToken);

router.post("/login", userController.login);


// Get all users
router.get(
  "/users",
  verifyToken,
  userController.getAllUsers
);

// Update user (profile photo + location)
router.put(
  "/userUpdate/:id",
  verifyToken,
  upload.single("profilePhoto"),
  userController.updateUser
);

// Delete user
router.delete(
  "/userDelete/:id",
  verifyToken,
  userController.deleteUser
);

router.get("/graph-stats",verifyAdmin, userController.getUserGrowthStats);

// -------------------- CATEGORY ROUTES --------------------

// router.get(
//   "/categories",
//   verifyToken,
//   cat.getAppCategories
// );




module.exports = router;

