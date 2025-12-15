// Create Express Router instance
const router = require("express").Router();

const verifyToken = require("../middlewares/auth.middlewares");

// Multer middleware for handling file uploads
const upload = require("../middlewares/upload");

// User controller (business logic)
const userController = require("../controllers/user.controller");

// -------------------- USER ROUTES --------------------

// Register a new user (with profile photo upload)
router.post(
    "/register",
    upload.single("profilePhoto"),
    userController.register
);

// Fetch all registered users
router.get(
  "/users",
  verifyToken,
  userController.getAllUsers
);

//Delete User Successfully
router.delete("/userDelete/:id",verifyToken,userController.deleteUser);


//update Profile excluede mobile number
router.put(
  "/userUpdate/:id",
  verifyToken,
  upload.single("profilePhoto"),
  userController.updateUser
);


// ----------------------------------------------------

module.exports = router;
