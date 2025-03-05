import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DecxDAGModule = buildModule("DecxDAGModule", (m) => {
    // Deploy UTF8Validator first
    const utf8Validator = m.contract("UTF8Validator", []);

    // Deploy DecxRegistry with UTF8Validator
    const decxRegistry = m.contract("DecxRegistry", [utf8Validator]);

    // Deploy DecxDAG with DecxRegistry
    const DecxDAG = m.contract("DecxDAG", [decxRegistry]);

    return {
        utf8Validator,
        decxRegistry,
        DecxDAG
    };
});

export default DecxDAGModule;
