const express = require("express");
const router = express.Router();
const trustedContactController = require("../controllers/trustedContact.controller");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");

router.post(
  "/add",
  verifyToken,
  upload.single("image"),
  trustedContactController.addTrustedContact
);


router.put(
  "/update/:id",
  verifyToken,
  upload.single("image"),
  trustedContactController.updateTrustedContact
);

router.delete(
  "/delete/:id",
  verifyToken,
  trustedContactController.deleteTrustedContact
);

module.exports = router;
