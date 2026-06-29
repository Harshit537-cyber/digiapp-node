const express = require("express");
const router = express.Router();
const jobController = require("../controllers/job.controller");
const verifyToken = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");
const optionalAuth= require("../middlewares/optionalAuth");

router.get("/search", jobController.searchJobs);
router.get("/my-jobs", verifyToken, jobController.getMyJobs);
router.get('/near-by-after-login', verifyToken, jobController.getTheNearbyLatestJob );
router.get('/near-by-homeapi', jobController.homeAPI)
router.get("/get-jobs", optionalAuth ,jobController.handleGetJobs )

router.get("/my-active", verifyToken, jobController.getMyActiveJobs);
router.get("/my-deactivated", verifyToken, jobController.getMyDeactivatedJobs);
router.get("/my-posted", verifyToken, jobController.getMyPostedJobs);
router.post("/save/:id", verifyToken, jobController.toggleSaveJob);
router.get("/my/saved", verifyToken, jobController.getSavedJobs);
router.get("/search-by-category", verifyToken, jobController.searchMyJobsAdvanced);

router.get("/recents", verifyToken, jobController.getRecentJobs)

// Post Job or Task (upto 3 images)
router.post("/post", verifyToken, upload.array("images", 3), jobController.postJob);

router.get("/all", jobController.getAllJobs);
router.get("/:id", jobController.getJobById);
router.put("/update/:id", verifyToken, upload.array("images", 3), jobController.updateJob);
router.post("/unblock", verifyToken, jobController.unlockJob)

router.patch("/deactivate/:id", verifyToken, jobController.deactivateJob); 

router.patch("/activate/:id", verifyToken, jobController.activateJob);





module.exports = router;