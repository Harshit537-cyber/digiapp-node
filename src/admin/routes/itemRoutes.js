const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { createItem, getAllItems, deleteItem, getUserCreatedItems, updateItem } = require("../controllers/itemsController");
const upload = require("../../middlewares/upload")
const router = express.Router();


router.post("/create", verifyAdmin,upload.array("images", 5), createItem);
router.get("/Items", verifyAdmin, getAllItems);

router.put("/update/:id", upload.array("images", 5),verifyAdmin, updateItem);

router.delete("/delete/:id", verifyAdmin, deleteItem);

router.get("/getItems-users", verifyAdmin, getUserCreatedItems);



module.exports = router;