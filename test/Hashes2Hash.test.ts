import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "./TestUtils";

// Generate characters and their atomic hashes
const CHAR1 = "a";
const CHAR2 = "b";

const isCoverage = process.env.COVERAGE === "true";

describe("Hashes2Hash", function () {
    // Define a fixture for consistent setup across tests
    async function deployHashes2HashFixture() {
        // First deploy DecxRegistry
        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const decxRegistryContract = await DecxRegistry.deploy();

        // Then deploy Hashes2Hash with DecxRegistry's address
        const Hashes2Hash = await ethers.getContractFactory("Hashes2Hash");
        const Hashes2HashContract = await Hashes2Hash.deploy(decxRegistryContract.target);

        return { decxRegistryContract, Hashes2HashContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

            // Check that the contract has a valid address
            expect(Hashes2HashContract.target).to.be.properAddress;
        });
    });

    describe("Storage and Lookup", function () {
        it("should reject zero hash", async function () {
            const { Hashes2HashContract, decxRegistryContract } = await loadFixture(deployHashes2HashFixture);
            await decxRegistryContract.addCharacterHash(CHAR1);
            const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR1);
            const zeroHash = ethers.ZeroHash;

            // expect the first hash to be rejected
            await expect(Hashes2HashContract.addHashes2Hash([zeroHash, atomicHash1])).to.be.revertedWithCustomError(
                Hashes2HashContract,
                "Hashes2Hash_ZeroHashNotAllowed"
            );

            // expect the second hash to be rejected
            await expect(Hashes2HashContract.addHashes2Hash([atomicHash1, zeroHash])).to.be.revertedWithCustomError(
                Hashes2HashContract,
                "Hashes2Hash_ZeroHashNotAllowed"
            );

            // expect both hashes to be rejected
            await expect(Hashes2HashContract.addHashes2Hash([zeroHash, zeroHash])).to.be.revertedWithCustomError(
                Hashes2HashContract,
                "Hashes2Hash_ZeroHashNotAllowed"
            );
        });

        it("Should store two hashes in the decxregistry", async function () {
            const { decxRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

            // Add Character2Hash units and get their hashes
            await decxRegistryContract.addCharacterHash(CHAR1);
            await decxRegistryContract.addCharacterHash(CHAR2);

            // Get the hashes
            const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR1);
            const atomicHash2 = await decxRegistryContract.getHashForCharacter(CHAR2);

            // ensure the hashes are present in the decxregistry
            expect(await decxRegistryContract.isHashPresent(atomicHash1)).to.be.true;
            expect(await decxRegistryContract.isHashPresent(atomicHash2)).to.be.true;

            // Add the it to the hashes2hash and wait for the transaction
            const atomicHashes = [atomicHash1, atomicHash2];
            const tx = await Hashes2HashContract.addHashes2Hash(atomicHashes);
            await tx.wait();

            // Get the hash from the decxregistry
            const generatedHash = await decxRegistryContract.getHashForHashes(atomicHash1, atomicHash2);

            // Calculate the expected hash the same way the contract does
            const expectedHash = TestUtils.GenerateHashFromHashes(atomicHashes);

            // Check that the hash is the same as the expected hash
            expect(generatedHash).to.equal(expectedHash);

            // Check that the hash exists
            const exists = await decxRegistryContract.isHashPresent(expectedHash);
            expect(exists).to.be.true;
        });
    });

    describe("Gas Optimization", function () {
        // Skip gas optimization tests during coverage
        (isCoverage ? it.skip : it)("Should optimize gas usage by avoiding duplicate hashing", async function () {
            const { decxRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

            // Add Character2Hash units and get their hashes
            await decxRegistryContract.addCharacterHash(CHAR1);
            await decxRegistryContract.addCharacterHash(CHAR2);

            // Get the actual Character2Hash unit hashes using getHashForCharacter
            const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR1);
            const atomicHash2 = await decxRegistryContract.getHashForCharacter(CHAR2);
            const atomicHashes = [atomicHash1, atomicHash2];

            // Add a hashes2hash
            const tx1 = await Hashes2HashContract.addHashes2Hash(atomicHashes);
            const receipt1 = await tx1.wait();

            // Add the same hashes2hash again
            const tx2 = await Hashes2HashContract.addHashes2Hash(atomicHashes);
            const receipt2 = await tx2.wait();

            // assign the same operation to both receipts
            receipt1.operation = `novel hashing of "${CHAR1}${CHAR2}"`;
            receipt2.operation = `hashing attempt of "${CHAR1}${CHAR2}"`;

            if (process.env.PRINT_FEES === "true") {
                await TestUtils.PrintGasFees([receipt1, receipt2]);
            }

            // Confirm no additional storage occurred by ensuring the gas cost is minimal
            expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
        });
    });
});
