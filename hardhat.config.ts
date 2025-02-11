import { HardhatUserConfig } from "hardhat/config";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-toolbox";

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
