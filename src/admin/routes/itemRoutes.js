const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { getAllItems } = require("../controllers/itemsController");

const router = express.Router();

router.get("/Items", verifyAdmin, getAllItems);

module.exports = router;