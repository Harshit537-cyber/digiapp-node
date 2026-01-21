const express = require("express");
const bloodRequestController = require("../controllers/bloodRequest.controller");
const verifyToken = require("../middlewares/auth.middlewares");

const router = express.Router();


router.get("/search", verifyToken, bloodRequestController.searchBloodRequests);

router.post("/create", verifyToken, bloodRequestController.createBloodRequest);

router.delete(
    "/delete/:id",
    verifyToken,
    bloodRequestController.deleteBloodRequest
);



router.get("/all", verifyToken, bloodRequestController.getAllBloodRequests);

router.get("/my-requests", verifyToken, bloodRequestController.getMyBloodRequests);


router.get("/:id", verifyToken, bloodRequestController.getBloodRequestById);

router.put("/update/:id", verifyToken, bloodRequestController.updateBloodRequest);

router.patch("/activate/:id", verifyToken, bloodRequestController.activateBloodRequest);

router.patch("/deactivate/:id", verifyToken, bloodRequestController.deactivateBloodRequest);

module.exports = router;
