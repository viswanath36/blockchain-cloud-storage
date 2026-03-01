const Web3 = require("web3");

// load contract JSON
const contractData = require("./abi/FileStorage.json");

// connect to Ganache
const web3 = new Web3("http://127.0.0.1:7545");

// paste deployed contract address
const contractAddress = "0x1813bF7732b5799Bc167e7bD3DE33E402E292Cd4";

// create contract
const contract = new web3.eth.Contract(
  contractData.abi,
  contractAddress
);

module.exports = { web3, contract };