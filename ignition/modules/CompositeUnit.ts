// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CompositeUnitModule = buildModule("CompositeUnitModule", (m) => {
  const compositeUnit = m.contract("CompositeUnit", []);
  return { compositeUnit };
});

export default CompositeUnitModule;