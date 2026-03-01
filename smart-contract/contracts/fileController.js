const multer = require("multer");
const { encrypt } = require("../utils/encryption");
const { uploadToIPFS } = require("../storage/ipfs");

exports.uploadFile = async (req, res) => {
    const encrypted = encrypt(req.file.buffer);
    const ipfsHash = await uploadToIPFS(encrypted);

    res.json({ message: "File uploaded", ipfsHash });
};