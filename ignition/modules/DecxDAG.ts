import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DecxDAGModule = buildModule("DecxDAGModule", (m) => {
    // Deploy base contracts first
    const hashRegistry = m.contract("HashRegistry", []);
    const utf8Validator = m.contract("UTF8Validator", []);

    // Deploy dependent contracts
    const character2Hash = m.contract("Character2Hash", [hashRegistry, utf8Validator]);
    const hashes2Hash = m.contract("Hashes2Hash", [hashRegistry]);

    // Deploy main contract with dependencies
    const DecxDAG = m.contract("DecxDAG", [character2Hash, hashes2Hash]);

    return {
        hashRegistry,
        utf8Validator,
        character2Hash,
        hashes2Hash,
        DecxDAG
    };
});

export default DecxDAGModule;
