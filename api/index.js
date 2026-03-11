require("dotenv").config({ path: require("path").join(__dirname, "../server/.env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("../server/routes/authRoute");
const fileRoutes = require("../server/routes/fileRoute");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

// MongoDB — reuse connection across warm invocations
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  isConnected = true;
}

// Wrap handler to ensure DB is connected before each request
const handler = async (req, res) => {
  await connectDB();
  return app(req, res);
};

module.exports = handler;
