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



router.get("/all", verifyToken, bloodRequestController.getAllBloodRequests);
router.get("/my-posted", verifyToken, bloodRequestController.getMyPostedBloodRequests);

router.get("/search-posted-blood-requests", verifyToken, bloodRequestController.searchMyBloodRequests);

router.get("/my-requests", verifyToken, bloodRequestController.getMyBloodRequests);

router.get("/search", verifyToken, bloodRequestController.searchBloodRequests);
router.get(
  "/urgent-and-recent",
  bloodRequestController.getUrgentAndRecentBloodRequests
);


router.get("/:id", verifyToken, bloodRequestController.getBloodRequestById);

router.put("/update/:id", verifyToken, bloodRequestController.updateBloodRequest);

router.patch("/activate/:id", verifyToken, bloodRequestController.activateBloodRequest);

router.patch("/deactivate/:id", verifyToken, bloodRequestController.deactivateBloodRequest);

module.exports = router;
