import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DecxDAGModule = buildModule("DecxDAGModule", (m) => {
    // Deploy dependencies first
    const hashRegistry = m.contract("HashRegistry", []);
    const character2Hash = m.contract("Character2Hash", [hashRegistry]);
    const hashes2Hash = m.contract("Hashes2Hash", [hashRegistry]);

    // Deploy main contract with dependencies
    const DecxDAG = m.contract("DecxDAG", [character2Hash, hashes2Hash]);

    return {
        hashRegistry,
        character2Hash,
        hashes2Hash,
        DecxDAG
    };
});

export default DecxDAGModule;
