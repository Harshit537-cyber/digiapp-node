
const express = require("express");
const router = express.Router();
const verifyAdmin = require('../middlewares/adminAuth');
const partTimeController = require("../controllers/partTimeJobController");


router.get('/jobs', verifyAdmin, partTimeController.getAllJobsForAdmin);


router.put('/job/update/:id', verifyAdmin, partTimeController.adminUpdateJob);


router.delete('/job/delete/:id', verifyAdmin, partTimeController.adminDeleteJob);

router.get('/job/:id', verifyAdmin, partTimeController.getJobByIdForAdmin);


module.exports = router;