const Web3 = require("web3");
const contractData = require("./abi/FileStorage.json");

const web3 = new Web3("http://127.0.0.1:7545"); // Ganache RPC

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log("Deploying from:", accounts[0]);

  const contract = new web3.eth.Contract(contractData.abi);

  const deployed = await contract.deploy({
    data: contractData.bytecode
  })
  .send({
    from: accounts[0],
    gas: 3000000
  });

  console.log("✅ Contract deployed at:");
  console.log(deployed.options.address);
};

deploy();