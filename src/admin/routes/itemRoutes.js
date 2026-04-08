const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { getAllItems, updateItem, deleteItem } = require("../controllers/itemsController");

const router = express.Router();

router.get("/Items", verifyAdmin, getAllItems);
router.delete("/delete/:id", verifyAdmin, deleteItem);

router.put("/update/:id", verifyAdmin, updateItem);

module.exports = router;