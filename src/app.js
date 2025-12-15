const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/user.routes");
const app = express();
require("dotenv").config();

connectDB();

app.use(express.json());

// Ye line ab zaruri nahi hai kyunki images Cloudinary par hain
// app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); 

app.use("/api/user", userRoutes);

module.exports = app;