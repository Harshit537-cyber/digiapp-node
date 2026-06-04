const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const verifyToken = require("../middlewares/auth.middlewares");

router.post("/create-order", verifyToken, paymentController.createOrder);

router.post("/verify-payment", verifyToken,paymentController.verifyPayment);

router.get("/history", verifyToken, paymentController.getTransactionHistory);

router.get("/credits-balance", verifyToken, paymentController.getUserCredits);
module.exports = router;