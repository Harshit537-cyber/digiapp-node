const express = require("express");
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const verifyToken = require('../middlewares/auth.middlewares'); 

router.post("/trigger",verifyToken, sosController.triggerSOS);
router.post("/deactivate-sos", verifyToken, sosController.deactivateSOS);
module.exports = router;