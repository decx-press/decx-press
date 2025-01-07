import { HardhatUserConfig } from "hardhat/config";
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
  paths: {
    sources: "./contracts", // Base path for Solidity files
  },
};

export default config;
