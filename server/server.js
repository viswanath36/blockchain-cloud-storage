require('dns').setDefaultResultOrder('ipv4first'); 
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoute");
const fileRoutes = require("./routes/fileRoute");

const app = express();


// ===============================
// ✅ ALLOW LARGE PAYLOADS (500MB)
// ===============================
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));


// ===============================
// ✅ CORS
// ===============================
app.use(cors());


// ===============================
// ✅ SERVE FRONTEND
// ===============================
const clientPath = path.resolve(__dirname, "../client");
app.use(express.static(clientPath));


// ===============================
// ✅ API ROUTES
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);


// ===============================
// ✅ HANDLE FRONTEND ROUTING
// ===============================
app.use((req, res) => {
  res.sendFile(path.join(clientPath, "login.html"));
});


// ===============================
// ✅ MONGODB CONNECTION
// ===============================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:");
    console.error(err.message);
    process.exit(1);
  });


// ===============================
// ✅ START SERVER
// ===============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});