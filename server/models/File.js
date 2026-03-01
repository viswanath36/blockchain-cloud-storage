const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  // IPFS hash (blockchain stored reference)
  ipfsHash: {
    type: String,
    required: true,
  },

  // stored filename (on server/ipfs)
  fileName: {
    type: String,
  },

  // original uploaded name
  originalName: {
    type: String,
    required: true,
  },

  // file MIME type
  mimeType: {
    type: String,
    required: true,
  },

  // file size (bytes)
  size: {
    type: Number,
  },

  // remaining downloads (RBAC control)
  downloadsLeft: {
    type: Number,
    default: 5,
  },

  // owner of file (for RBAC & access control)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // upload timestamp
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("File", fileSchema);