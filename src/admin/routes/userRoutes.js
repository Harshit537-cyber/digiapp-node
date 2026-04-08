const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { getAllUsers } = require("../controllers/userController");
const router = express.Router();


router.get("/all-users",verifyAdmin,getAllUsers);

module.exports = router;
