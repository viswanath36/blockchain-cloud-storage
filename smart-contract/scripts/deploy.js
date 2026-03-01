const hre = require("hardhat");

async function main() {
  const FileStorage = await hre.ethers.getContractFactory("FileStorage");
  const fileStorage = await FileStorage.deploy();

  await fileStorage.waitForDeployment();  // ✅ Hardhat v3 method

  console.log("Contract deployed to:", await fileStorage.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});