const express = require("express");
const router = express.Router();
const jobController = require("../controllers/job.controller");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");


router.get("/search", jobController.searchJobs);


router.get("/my-jobs", verifyToken, jobController.getMyJobs);


router.get("/my-active", verifyToken, jobController.getMyActiveJobs);
router.get("/my-deactivated", verifyToken, jobController.getMyDeactivatedJobs);


// Post Job or Task (upto 3 images)
router.post("/post", verifyToken, upload.array("images", 3), jobController.postJob);

router.get("/all", jobController.getAllJobs);
router.get("/:id", jobController.getJobById);
router.put("/update/:id", verifyToken, upload.array("images", 3), jobController.updateJob);

router.patch("/deactivate/:id", verifyToken, jobController.deactivateJob); 

router.patch("/activate/:id", verifyToken, jobController.activateJob);





module.exports = router;