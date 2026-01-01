const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/user.routes");
const bloodRequestRoutes  = require("../../DigiApp/src/routes/bloodRequest.routes");
const jobRoutes = require("./routes/job.routes");
const app = express();
require("dotenv").config();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

 

app.use("/api/user", userRoutes);

app.use("/api/blood-request", bloodRequestRoutes);

app.use("/api/job", jobRoutes); 


module.exports = app;