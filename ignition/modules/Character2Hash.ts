// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const Character2HashModule = buildModule("Character2HashModule", (m) => {
  const Character2Hash = m.contract("Character2Hash", []);
  return { Character2Hash };
});

export default Character2HashModule;