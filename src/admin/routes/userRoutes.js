const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const upload = require("../../middlewares/upload");
const { updateProfile, getAllUsers } = require("../controllers/userController");
const router = express.Router();


router.get("/all-users",verifyAdmin,getAllUsers);
router.put("/update-profile", verifyAdmin, upload.single("profilePhoto"), updateProfile);
module.exports = router;
