const { create } = require("ipfs-http-client");

// connect to local IPFS node
const ipfs = create({
  host: "127.0.0.1",
  port: "5001",
  protocol: "http",
});

module.exports = ipfs;