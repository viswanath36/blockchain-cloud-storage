const ipfs = require("../utils/ipfs");
const File = require("../models/File");
const { contract, web3 } = require("../blockchain/eth");


// ==============================
// UPLOAD FILE
// ==============================
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // upload to IPFS
    const result = await ipfs.add(req.file.buffer);
    const ipfsHash = result.path;

    // store hash on blockchain
    const accounts = await web3.eth.getAccounts();

    await contract.methods
      .storeFileHash(ipfsHash)
      .send({
        from: accounts[0],
        gas: 500000,
      });

    // save metadata in MongoDB
    const newFile = new File({
      ipfsHash: ipfsHash,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.user.id,   // ✅ required
    });

    await newFile.save();

    res.json({
      message: "File uploaded successfully",
      file: newFile,
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
};


// ==============================
// LIST FILES
// ==============================
exports.listFiles = async (req, res) => {
  try {
    const files = await File.find()
      .populate("owner", "email")
      .sort({ uploadedAt: -1 });

    res.json(files);
  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ message: "Error fetching files" });
  }
};


// ==============================
// DOWNLOAD FILE
// ==============================
const https = require("https");

const axios = require("axios");

// DOWNLOAD FILE
exports.downloadFile = async (req, res) => {
  try {
    const { hash } = req.params;

    // 🔹 Find file in MongoDB
    const file = await File.findOne({ ipfsHash: hash });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // 🔹 Verify file hash on blockchain
    const isValid = await contract.methods.verifyFileHash(hash).call();
    if (!isValid) {
      return res.status(400).json({ message: "File verification failed" });
    }

    // 🔹 Fetch file from IPFS
    const ipfsURL = `https://dweb.link/ipfs/${hash}`;

    const response = await axios({
      method: "GET",
      url: ipfsURL,
      responseType: "stream",
    });

    // 🔹 Force file download with original filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName}"`
    );

    // 🔹 Preserve original content type
    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "application/octet-stream"
    );

    // 🔹 Send file to browser
    response.data.pipe(res);

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err.message);
    res.status(500).json({ message: "Download failed" });
  }
};


// ==============================
// DELETE FILE
// ==============================
exports.deleteFile = async (req, res) => {
  try {
    const { hash } = req.params;

    const file = await File.findOne({ ipfsHash: hash });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // only owner or admin can delete
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // unpin from IPFS (optional)
    try {
      await ipfs.pin.rm(hash);
      console.log("IPFS file unpinned:", hash);
    } catch {
      console.log("Unpin skipped");
    }

    await file.deleteOne();

    res.json({ message: "File deleted successfully" });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};