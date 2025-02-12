import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "./TestUtils";

describe("DecxDAG", function () {
    async function deployDecxDAGFixture() {
        // Deploy HashRegistry
        const HashRegistry = await ethers.getContractFactory("HashRegistry");
        const hashRegistryContract = await HashRegistry.deploy();

        // Deploy Character2Hash
        const Character2Hash = await ethers.getContractFactory("Character2Hash");
        const character2HashContract = await Character2Hash.deploy(hashRegistryContract.target);

        // Deploy Hashes2Hash
        const Hashes2Hash = await ethers.getContractFactory("Hashes2Hash");
        const hashes2HashContract = await Hashes2Hash.deploy(hashRegistryContract.target);

        // Deploy DecxDAG with the addresses of the above contracts
        const DecxDAG = await ethers.getContractFactory("DecxDAG");
        const decxDAGContract = await DecxDAG.deploy(character2HashContract.target, hashes2HashContract.target);

        return { decxDAGContract, character2HashContract, hashes2HashContract, hashRegistryContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { decxDAGContract, character2HashContract, hashes2HashContract, hashRegistryContract } =
                await loadFixture(deployDecxDAGFixture);
            // Check that the contracts have a valid address
            expect(decxDAGContract.target).to.be.properAddress;
            expect(character2HashContract.target).to.be.properAddress;
            expect(hashes2HashContract.target).to.be.properAddress;
            expect(hashRegistryContract.target).to.be.properAddress;
        });
    });
});
