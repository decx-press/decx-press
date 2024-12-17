// TODO: below is all rough-in code. remove everything when we have a real contract.
const { ethers } = require("hardhat");

async function main() {
  const MyContract = await ethers.getContractFactory("MyContract");
  const myContract = await MyContract.deploy("Hello, world!");

  await myContract.deployed();
  console.log("Contract deployed to:", myContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});