const express = require("express");
const router = express.Router();
const bloodController = require("../controllers/bloodRequestController");
const adminAuth = require("../middlewares/adminAuth");
const verifyAdmin = require("../middlewares/adminAuth");

// Saare Routes yahan define hain
router.post("/blood-requests",verifyAdmin, bloodController.createBloodRequest); 
router.get("/blood-requests",verifyAdmin, bloodController.getAllBloodRequests); 
router.get("/blood-requests/:id",verifyAdmin ,bloodController.getBloodRequestById); 
router.put("/blood-requests/:id", verifyAdmin ,bloodController.updateBloodRequest); 
router.delete("/blood-requests/:id",verifyAdmin ,bloodController.deleteBloodRequest); 

module.exports = router;