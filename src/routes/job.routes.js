const express = require("express");
const router = express.Router();
const jobController = require("../controllers/job.controller");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");

// Post Job or Task (upto 3 images)
router.post("/post", verifyToken, upload.array("images", 3), jobController.postJob);

router.get("/all", jobController.getAllJobs);
router.get("/:id", jobController.getJobById);
router.put("/update/:id", verifyToken, upload.array("images", 3), jobController.updateJob);

module.exports = router;