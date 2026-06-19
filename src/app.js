const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/user.routes");
const bloodRequestRoutes = require("./routes/bloodRequest.routes");
const trustedContactRoutes = require("./routes/trustedContact.routes");
const jobRoutes = require("./routes/job.routes");
const businessRoutes = require("./routes/business.routes");
const itemRoutes = require("./routes/item.routes");
const adminRoutes = require("./admin/routes/adminRoutes");
const fullTimeJobRoutes = require('./admin/routes/fullTimeJobRoutes');
const partTimeJobRoutes = require('./admin/routes/partTimeJobRoutes');
const bloodRoutes = require("./admin/routes/bloodRequestRoutes");
const saveJobsAll = require("./routes/saved.routes")
const chatRoutes = require("./routes/chat.routes")
const verifiedBusinessRoutes = require("./admin/routes/verifiedBusinessRoutes"); 

const adminCategoryRoutes = require('../src/admin/routes/businessCategoryRoutes');
 const userCategoryRoutes  = require('./routes/user.routes');

 const adminBusinessRoutes = require("./admin/routes/adminBusinessRoutes");

 const CouponRoutes  = require('./routes/couponRoutes');
const paymentRoutes = require("./routes/paymentRoutes")

const cors = require("cors");

require("dotenv").config();

const app = express();
connectDB();


app.use(cors()); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/user", userRoutes);
app.use("/api/blood-request", bloodRequestRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/trusted-contact", trustedContactRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/admin/part-time', partTimeJobRoutes);
app.use('/api/admin/full-time', fullTimeJobRoutes);
app.use("/api/admin", bloodRoutes);
app.use("/api/admin/users", require("../src/admin/routes/userRoutes"));
app.use("/api/admin/items", require("../src/admin/routes/itemRoutes"));
app.use('/api/admin/category', adminCategoryRoutes);
app.use("/api/admin/localJobs", require("../src/admin/routes/localJobsRoutes"));
app.use("/api/admin/subcategoryData", require("../src/admin/routes/subCategoryRoutes"))
app.use("/api/admin/business", verifiedBusinessRoutes); 
app.use("/api/sos", require("../src/routes/sosRoutes"));
app.use("/api/admin/notifications", require("../src/admin/routes/adminNotificationRoutes"))
app.use('/api/user', userCategoryRoutes);
app.use("/api/admin/manage-business", adminBusinessRoutes);
app.use('/api/saved', saveJobsAll);
app.use('/api/admin/coupon', CouponRoutes); 
app.use("/api/payments", paymentRoutes);
app.use("/api/users/businessCategories", require("../src/routes/userBusinessCategoriesRoutes"));
app.use("/api/admin/jobsCategory", require("../src/admin/routes/jobsCategoryRoutes"))
app.use("/api/user/userJobCategories", require("../src/routes/userJobsCategoriesRoutes"));
app.use("/api/admin/itemCategories", require("../src/admin/routes/itemCategoriesRoutes"));
app.use("/api/user/itemCategories", require("../src/routes/userItemCategoriesRoutes"));
app.use("/api/admin/banner", require("../src/admin/routes/bannerRoutes"));

module.exports = app;
