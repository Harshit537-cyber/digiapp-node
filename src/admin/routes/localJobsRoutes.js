const express = require("express");
const verifyAdmin = require("../middlewares/adminAuth");
const { getLocalJobs } = require("../controllers/locaJobsController");

const router = express.Router();

router.get("/get-localJobs", verifyAdmin, getLocalJobs);

module.exports = router;