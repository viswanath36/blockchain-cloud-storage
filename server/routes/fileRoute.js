const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const File = require("../models/File");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { uploadToIPFS, downloadFromIPFS } = require("../storage/ipfs");


// =============================
// MULTER CONFIG (500MB LIMIT)
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});


// =============================
// UPLOAD FILE
// =============================
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const ipfsHash = await uploadToIPFS(filePath);

    fs.unlinkSync(filePath);

    const newFile = new File({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      ipfsHash,
      owner: req.user.id,
      downloadsLeft: 10
    });

    await newFile.save();

    res.json({ message: "File uploaded successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});


// =============================
// LIST FILES (ADMIN vs USER)
// =============================
router.get("/list", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let files;

    // 👑 ADMIN sees all files
    if (user.role === "admin") {
      files = await File.find().populate("owner", "email");
    } else {
      // 👤 normal user sees only their files
      files = await File.find({ owner: req.user.id })
        .populate("owner", "email");
    }

    res.json(files);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch files" });
  }
});


// ===============================
// DOWNLOAD FILE
// ===============================
router.get("/download/:hash", auth, async (req, res) => {
  try {
    const file = await File.findOne({ ipfsHash: req.params.hash });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // check permission
    const user = await User.findById(req.user.id);

    if (
      file.owner.toString() !== req.user.id &&
      user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // check download limit
    if (file.downloadsLeft <= 0 && user.role !== "admin") {
      return res.status(403).json({ message: "Download limit reached" });
    }

    const buffer = await downloadFromIPFS(file.ipfsHash);

    // reduce download count
    if (user.role !== "admin") {
      file.downloadsLeft -= 1;
      await file.save();
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName}"`
    );

    res.setHeader(
      "Content-Type",
      file.mimeType || "application/octet-stream"
    );

    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Download failed" });
  }
});


// =============================
// DELETE FILE
// =============================
router.delete("/delete/:hash", auth, async (req, res) => {
  try {
    const file = await File.findOne({ ipfsHash: req.params.hash });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const user = await User.findById(req.user.id);

    // owner OR admin can delete
    if (
      file.owner.toString() !== req.user.id &&
      user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await file.deleteOne();

    res.json({ message: "File deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;