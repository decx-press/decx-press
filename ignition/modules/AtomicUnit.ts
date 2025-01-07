// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// TODO: does this need to be more built out?

const AtomicUnitModule = buildModule("AtomicUnitModule", (m) => {
  // Generic deploy - without constructor arguments
  const atomicUnit = m.contract("AtomicUnit", []);
  return { atomicUnit };
});

export default AtomicUnitModule;