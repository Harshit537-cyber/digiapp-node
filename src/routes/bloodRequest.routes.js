const express = require("express");
const bloodRequestController = require("../controllers/bloodRequest.controller");
const verifyToken = require("../middlewares/auth.middlewares");

const router = express.Router();

router.post("/create", verifyToken, bloodRequestController.createBloodRequest);

router.delete(
    "/delete/:id",
    verifyToken,
    bloodRequestController.deleteBloodRequest
);


/* 🔹 GET all blood requests */
router.get("/all", verifyToken, bloodRequestController.getAllBloodRequests);

/* 🔹 GET single blood request by ID */
router.get("/:id", verifyToken, bloodRequestController.getBloodRequestById);

router.put("/update/:id", verifyToken, bloodRequestController.updateBloodRequest);

module.exports = router;
