const express = require("express");
const router = express.Router();
const trustedContactController = require("../controllers/trustedContact.controller");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");

router.post("/add", verifyToken, upload.single("image"), trustedContactController.addTrustedContact);




router.get("/all", verifyToken, trustedContactController.getAllContacts);

router.get("/requests/incoming", verifyToken, trustedContactController.getIncomingRequests); 


router.get("/request/incoming-by-id/:requestId", verifyToken, trustedContactController.getRequestById);

router.patch("/block/:id", verifyToken, trustedContactController.blockContact);
router.patch("/unblock/:id", verifyToken, trustedContactController.unblockContact);

router.put("/requests/respond/:id", verifyToken, trustedContactController.respondToRequest);


router.put("/update/:id", verifyToken, upload.single("image"), trustedContactController.updateTrustedContact);

router.delete("/delete/:id", verifyToken, trustedContactController.deleteTrustedContact);

router.get("/:id", verifyToken, trustedContactController.getContactById); 




module.exports = router;