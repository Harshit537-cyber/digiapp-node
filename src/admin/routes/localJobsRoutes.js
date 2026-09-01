const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const localJobController = require("../../admin/controllers/locaJobsController");
const router =express.Router();
const upload = require("../../middlewares/upload")

router.post("/create", verifyAdmin,upload.array('images', 5),  localJobController.adminCreateLocalJob);

router.get("/admin-get-jobs", verifyAdmin, localJobController.getLocalJobsForAdmin );

router.put("/update-job/:id", verifyAdmin, upload.array('images', 5), localJobController.adminUpdateLocalJob);

router.get("/public/local-jobs", verifyAdmin, localJobController.getRegularUserLocalJobs);

router.get("/user-list", verifyAdmin, localJobController.getUsersListForAdmin);


router.delete("/delete/:id", verifyAdmin, localJobController.adminDeleteLocalJob)

module.exports  = router;