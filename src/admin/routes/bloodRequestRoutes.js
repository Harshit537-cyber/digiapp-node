const express = require("express");
const router = express.Router();
const bloodController = require("../controllers/bloodRequestController");
const verifyAdmin = require("../middlewares/adminAuth");

router.get("/blood-requests/nearby", verifyAdmin, bloodController.getNearbyBloodRequests);
router.get("/bloodRequest-urgency", verifyAdmin, bloodController.getBloodRequestsByUrgency)
router.post("/blood-requests", verifyAdmin, bloodController.createBloodRequest); 
router.get("/blood-requests", verifyAdmin, bloodController.getAllBloodRequests); 
router.get("/blood-requests/:id", verifyAdmin, bloodController.getBloodRequestById); 
router.put("/blood-requests/:id", verifyAdmin, bloodController.updateBloodRequest); 
router.delete("/blood-requests/:id", verifyAdmin, bloodController.deleteBloodRequest); 

module.exports = router;