const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const upload = require("../../middlewares/upload");
const { updateProfile, getAllUsers, deleteUser, searchUserByName, getAllUsersForDropdown } = require("../controllers/userController");
const router = express.Router();

router.get("/search", verifyAdmin , searchUserByName);
router.get("/all-users",verifyAdmin,getAllUsers);
router.get("/dropdown-users", getAllUsersForDropdown);
router.put("/update-profile/:id", verifyAdmin, upload.single("profilePhoto"), updateProfile);
router.delete("/delete/:id", verifyAdmin, deleteUser);
module.exports = router;
