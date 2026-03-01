let ipfs;

// connect to local IPFS node (IPFS Desktop)
(async () => {
  try {
    const { create } = await import("ipfs-http-client");

    ipfs = create({
      url: "http://127.0.0.1:5001/api/v0",
    });

    console.log("✅ IPFS connected");
  } catch (err) {
    console.error("❌ IPFS connection failed:", err.message);
  }
})();


// ===============================
// UPLOAD TO IPFS
// ===============================
async function uploadToIPFS(filePath) {
  const fs = require("fs");

  if (!ipfs) throw new Error("IPFS not connected");

  const file = fs.readFileSync(filePath);
  const result = await ipfs.add(file);

  return result.cid.toString();
}


// ===============================
// DOWNLOAD FROM IPFS
// ===============================
const downloadFromIPFS = async (hash) => {
  if (!ipfs) throw new Error("IPFS not connected");

  const stream = ipfs.cat(hash);
  const data = [];

  for await (const chunk of stream) {
    data.push(chunk);
  }

  return Buffer.concat(data);
};


// ===============================
// DELETE FROM IPFS (UNPIN)
// ===============================
async function deleteFromIPFS(hash) {
  try {
    await ipfs.pin.rm(hash);
    console.log("IPFS file unpinned:", hash);
    return true;
  } catch (err) {
    console.log("IPFS delete warning:", err.message);
    return false;
  }
}

module.exports = {
  uploadToIPFS,
  downloadFromIPFS,
  deleteFromIPFS,
};