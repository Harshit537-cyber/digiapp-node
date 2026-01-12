const express = require("express");
const connectDB = require("./config/db");

const userRoutes = require("./routes/user.routes");
const bloodRequestRoutes = require("./routes/bloodRequest.routes");
const trustedContactRoutes = require("./routes/trustedContact.routes");
const jobRoutes = require("./routes/job.routes");
const businessRoutes = require("./routes/business.routes");
const itemRoutes = require("./routes/item.routes");
const adminRoutes = require("./admin/routes/adminRoutes");

require("dotenv").config();

const app = express();
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", userRoutes);
app.use("/api/blood-request", bloodRequestRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/trusted-contact", trustedContactRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);

module.exports = app;
