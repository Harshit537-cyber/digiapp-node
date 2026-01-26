
const express = require("express");
const router = express.Router();
const verifyAdmin = require('../middlewares/adminAuth');
const partTimeController = require("../controllers/partTimeJobController");
const upload = require("../../middlewares/upload");


router.get('/jobs', verifyAdmin, partTimeController.getAllJobsForAdmin);

router.post('/job/create', verifyAdmin, upload.array('images', 5), partTimeController.adminCreateJob);

router.put('/job/update/:id', verifyAdmin, partTimeController.adminUpdateJob);


router.delete('/job/delete/:id', verifyAdmin, partTimeController.adminDeleteJob);

router.get('/job/:id', verifyAdmin, partTimeController.getJobByIdForAdmin);


module.exports = router;