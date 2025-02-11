import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// Generate characters and their atomic hashes
const CHAR1 = "a";
const CHAR2 = "b";

describe("Hashes2Hash", function () {
    // Define a fixture for consistent setup across tests
    async function deployHashes2HashFixture() {
        // First deploy HashRegistry
        const HashRegistry = await ethers.getContractFactory("HashRegistry");
        const hashRegistryContract = await HashRegistry.deploy();

        // Then deploy Hashes2Hash with HashRegistry's address
        const Hashes2Hash = await ethers.getContractFactory("Hashes2Hash");
        const Hashes2HashContract = await Hashes2Hash.deploy(hashRegistryContract.target);

        return { hashRegistryContract, Hashes2HashContract };
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
            const { Hashes2HashContract, hashRegistryContract } = await loadFixture(deployHashes2HashFixture);
            await hashRegistryContract.addCharacterHash(CHAR1);
            const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
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

        it("Should store two hashes in the hash registry", async function () {
            const { hashRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

            // Add Character2Hash units and get their hashes
            await hashRegistryContract.addCharacterHash(CHAR1);
            await hashRegistryContract.addCharacterHash(CHAR2);

            // Get the hashes
            const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
            const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);

            // ensure the hashes are present in the hash registry
            expect(await hashRegistryContract.isHashPresent(atomicHash1)).to.be.true;
            expect(await hashRegistryContract.isHashPresent(atomicHash2)).to.be.true;

            // Add the it to the hashes2hash and wait for the transaction
            const atomicHashes = [atomicHash1, atomicHash2];
            const tx = await Hashes2HashContract.addHashes2Hash(atomicHashes);
            await tx.wait();

            // Get the hash from the hash registry
            const generatedHash = await hashRegistryContract.getHashForHashes(atomicHash1, atomicHash2);

            // Calculate the expected hash the same way the contract does
            const expectedHash = TestUtils.GenerateHashFromHashes(atomicHashes);

            // Check that the hash is the same as the expected hash
            expect(generatedHash).to.equal(expectedHash);

            // Check that the hash exists
            const exists = await hashRegistryContract.isHashPresent(expectedHash);
            expect(exists).to.be.true;
        });
    });

    describe("Gas Optimization", function () {
        it("Should optimize gas usage by avoiding duplicate hashing", async function () {
            const { hashRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

            // Add Character2Hash units and get their hashes
            await hashRegistryContract.addCharacterHash(CHAR1);
            await hashRegistryContract.addCharacterHash(CHAR2);

            // Get the actual Character2Hash unit hashes using getHashForCharacter
            const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
            const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
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

            // print the gas fees
            await TestUtils.PrintGasFees([receipt1, receipt2]);

            // Confirm no additional storage occurred by ensuring the gas cost is minimal
            expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
        });
    });
});
