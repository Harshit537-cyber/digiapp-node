const express = require("express");
const router = express.Router();
const trustedContactController = require("../controllers/trustedContact.controller");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");

// 1. Pehle saare Fix/Static routes rakhein
router.post("/add", verifyToken, upload.single("image"), trustedContactController.addTrustedContact);




router.get("/all", verifyToken, trustedContactController.getAllContacts);

router.get("/requests/incoming", verifyToken, trustedContactController.getIncomingRequests); 


router.patch("/block/:id", verifyToken, trustedContactController.blockContact);
router.patch("/unblock/:id", verifyToken, trustedContactController.unblockContact);

// 2. Phir Action routes
router.put("/requests/respond/:id", verifyToken, trustedContactController.respondToRequest);

// 3. Sabse NICHE dynamic ID waale routes rakhein
router.put("/update/:id", verifyToken, upload.single("image"), trustedContactController.updateTrustedContact);

router.delete("/delete/:id", verifyToken, trustedContactController.deleteTrustedContact);

router.get("/:id", verifyToken, trustedContactController.getContactById); // <--- Ye hamesha niche hona chahiye




module.exports = router;