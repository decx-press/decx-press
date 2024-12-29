// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AtomicUnitModule = buildModule("AtomicUnitModule", (m) => {
  const atomicUnit = m.contract("AtomicUnit", []);
  return { atomicUnit };
});

export default AtomicUnitModule;