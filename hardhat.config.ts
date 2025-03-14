import { HardhatUserConfig } from "hardhat/config";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true, // Optimize the code for gas efficiency
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: true,
    outputFile: "coverage.json",
    noColors: true,
    currency: "USD",
    token: "ETH",
  },
  paths: {
    sources: "./contracts", // Base path for Solidity files
    tests: "./test", // Base path for test files
  },
};

export default config;
