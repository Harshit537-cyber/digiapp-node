const express = require("express");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");
const { createReview } = require("../controllers/reviewController");
const router = express.Router();

router.post("/post-review", verifyToken, upload.array("images", 3), createReview);

module.exports = router;