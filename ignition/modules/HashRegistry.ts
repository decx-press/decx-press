// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HashRegistryModule = buildModule("HashRegistryModule", (m) => {
    const HashRegistry = m.contract("HashRegistry", []);
    return { HashRegistry };
});

export default HashRegistryModule;
