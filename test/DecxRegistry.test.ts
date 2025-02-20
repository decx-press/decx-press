import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "./TestUtils";

// Use a single character string for testing
const CHAR = "a";
const INVALID_HASH_ERROR = "DecxRegistry_InvalidHash";

describe("DecxRegistry", function () {
    // Define a fixture for consistent setup across tests
    async function deployDecxRegistryFixture() {
        // First deploy the DecxRegistry contract
        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const hashRegistryContract = await DecxRegistry.deploy();

        return { hashRegistryContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { hashRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Check that the contract has a valid address
            expect(hashRegistryContract.target).to.be.properAddress;
        });
    });

    describe("Storage and Lookup", function () {
        it("Should store a single UTF Character", async function () {
            const { hashRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const hash = TestUtils.GenerateHashFromChar(CHAR);

            // Add the Character2Hash unit
            await hashRegistryContract.addCharacterHash(CHAR);

            // Check that the hash exists
            const exists = await hashRegistryContract.isHashPresent(hash);
            expect(exists).to.be.true;

            // Check reverse lookup
            const storedHash = await hashRegistryContract.getHashForCharacter(CHAR);
            expect(storedHash).to.equal(hash);
        });

        it("Should return the existing hash for duplicate Character2Hash Units", async function () {
            const { hashRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Add the first Character2Hash unit
            await hashRegistryContract.addCharacterHash(CHAR);

            // Extract the emitted hash
            const hash1 = await hashRegistryContract.getHashForCharacter(CHAR);

            // Check that the atomicLookupMapping is not zero for the added character
            expect(await hashRegistryContract.getHashForCharacter(CHAR)).to.not.equal(ethers.ZeroHash);
            expect(hash1).to.not.equal(ethers.ZeroHash); // Ensure the returned hash is also not zero

            // Add the same Character2Hash unit again
            await hashRegistryContract.addCharacterHash(CHAR);

            // Extract the returned hash
            const hash2 = await hashRegistryContract.getHashForCharacter(CHAR);

            // Verify that the hashes are the same
            expect(hash1).to.equal(hash2);
        });

        it("Should return the existing hash for duplicate Hashes2Hash Units", async function () {
            const { hashRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Add the first Character2Hash unit
            await hashRegistryContract.addCharacterHash(CHAR);

            // Extract the emitted hash
            const charHash = await hashRegistryContract.getHashForCharacter(CHAR);

            await hashRegistryContract.addHashesHash(charHash, charHash);

            const hash2hashes1 = await hashRegistryContract.getHashForHashes(charHash, charHash);

            const hash2hashes2 = await hashRegistryContract.getHashForHashes(charHash, charHash);

            // Verify that the hashes are the same
            expect(hash2hashes1).to.equal(hash2hashes2);
        });

        it("Should not allow invalid hash pairs", async function () {
            const { hashRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // First add the Character2Hash unit
            await hashRegistryContract.addCharacterHash(CHAR);
            const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR);

            // Create a fake hash that's the right format but not registered in Character2Hash
            const fakeHash = "0x" + "1".repeat(64); // Creates a valid bytes32 hex string

            await expect(hashRegistryContract.addHashesHash(atomicHash1, fakeHash)).to.be.revertedWithCustomError(
                hashRegistryContract,
                INVALID_HASH_ERROR
            );

            await expect(hashRegistryContract.addHashesHash(fakeHash, atomicHash1)).to.be.revertedWithCustomError(
                hashRegistryContract,
                INVALID_HASH_ERROR
            );

            await expect(hashRegistryContract.addHashesHash(fakeHash, fakeHash)).to.be.revertedWithCustomError(
                hashRegistryContract,
                INVALID_HASH_ERROR
            );
        });

        it("Should emit ContentEncrypted and EncryptionPathCreated events for a character", async function () {
            const { hashRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const hash = TestUtils.GenerateHashFromChar(CHAR);

            // Call the addCharacterHash function and wait for the transaction receipt
            const tx = await hashRegistryContract.addCharacterHash(CHAR);
            const receipt = await tx.wait();

            // Check for ContentEncrypted event
            const contentEncryptedEvent = receipt.logs.find((log: any) => log.fragment.name === "ContentEncrypted");
            const [signer] = await ethers.getSigners();
            expect(contentEncryptedEvent.args.creator).to.equal(await signer.getAddress());
            expect(contentEncryptedEvent).to.exist; // Ensure the event was emitted
            expect(contentEncryptedEvent.args.hash).to.equal(hash); // Check the hash argument

            // Check for EncryptionPathCreated event
            const encryptionPathCreatedEvent = receipt.logs.find(
                (log: any) => log.fragment.name === "EncryptionPathCreated"
            );
            expect(encryptionPathCreatedEvent).to.exist; // Ensure the event was emitted
            expect(encryptionPathCreatedEvent.args.hash).to.equal(hash); // Check the hash argument
            expect(encryptionPathCreatedEvent.args.components).to.deep.equal([hash, ethers.ZeroHash]); // Check the components argument
        });
    });
});
