const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { getLocalJobs, createLocalJob } = require("../controllers/locaJobsController");

const router = express.Router();


router.post("/create/:adminId", verifyAdmin, createLocalJob);
router.get("/get-localJobs", verifyAdmin, getLocalJobs);

module.exports = router;