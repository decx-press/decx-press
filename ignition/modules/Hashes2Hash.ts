// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const Hashes2HashModule = buildModule("Hashes2HashModule", (m) => {
    const Hashes2Hash = m.contract("Hashes2Hash", []);
    return { Hashes2Hash };
});

export default Hashes2HashModule;
