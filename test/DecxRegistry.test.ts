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
        const decxRegistryContract = await DecxRegistry.deploy();

        return { decxRegistryContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Check that the contract has a valid address
            expect(decxRegistryContract.target).to.be.properAddress;
        });
    });

    describe("Hash Storage and Lookup", function () {
        it("Should store a single UTF Character", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const hash = TestUtils.GenerateHashFromChar(CHAR);

            // Add the Character2Hash unit
            await decxRegistryContract.addCharacterHash(CHAR);

            // Check that the hash exists
            const exists = await decxRegistryContract.isHashPresent(hash);
            expect(exists).to.be.true;

            // Check reverse lookup
            const storedHash = await decxRegistryContract.getHashForCharacter(CHAR);
            expect(storedHash).to.equal(hash);
        });

        it("Should return the existing hash for duplicate Character2Hash Units", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Add the first Character2Hash unit
            await decxRegistryContract.addCharacterHash(CHAR);

            // Extract the emitted hash
            const hash1 = await decxRegistryContract.getHashForCharacter(CHAR);

            // Check that the atomicLookupMapping is not zero for the added character
            expect(await decxRegistryContract.getHashForCharacter(CHAR)).to.not.equal(ethers.ZeroHash);
            expect(hash1).to.not.equal(ethers.ZeroHash); // Ensure the returned hash is also not zero

            // Add the same Character2Hash unit again
            await decxRegistryContract.addCharacterHash(CHAR);

            // Extract the returned hash
            const hash2 = await decxRegistryContract.getHashForCharacter(CHAR);

            // Verify that the hashes are the same
            expect(hash1).to.equal(hash2);
        });

        it("Should return the existing hash for duplicate Hashes2Hash Units", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Add the first Character2Hash unit
            await decxRegistryContract.addCharacterHash(CHAR);

            // Extract the emitted hash
            const charHash = await decxRegistryContract.getHashForCharacter(CHAR);

            await decxRegistryContract.addHashesHash(charHash, charHash);

            const hash2hashes1 = await decxRegistryContract.getHashForHashes(charHash, charHash);

            const hash2hashes2 = await decxRegistryContract.getHashForHashes(charHash, charHash);

            // Verify that the hashes are the same
            expect(hash2hashes1).to.equal(hash2hashes2);
        });

        it("Should not allow invalid hash pairs", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // First add the Character2Hash unit
            await decxRegistryContract.addCharacterHash(CHAR);
            const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR);

            // Create a fake hash that's the right format but not registered in Character2Hash
            const fakeHash = "0x" + "1".repeat(64); // Creates a valid bytes32 hex string

            await expect(decxRegistryContract.addHashesHash(atomicHash1, fakeHash)).to.be.revertedWithCustomError(
                decxRegistryContract,
                INVALID_HASH_ERROR
            );

            await expect(decxRegistryContract.addHashesHash(fakeHash, atomicHash1)).to.be.revertedWithCustomError(
                decxRegistryContract,
                INVALID_HASH_ERROR
            );

            await expect(decxRegistryContract.addHashesHash(fakeHash, fakeHash)).to.be.revertedWithCustomError(
                decxRegistryContract,
                INVALID_HASH_ERROR
            );
        });
    });
    describe("Encryption Storage and Events", function () {
        it("Should emit ContentEncrypted and EncryptionPathCreated events for a single character", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const hash = TestUtils.GenerateHashFromChar(CHAR);

            // Call the addCharacterHash function and wait for the transaction receipt
            const tx = await decxRegistryContract.addCharacterHash(CHAR);
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

        it("Should store encryption for a single character correctly", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const expectedHash = TestUtils.GenerateHashFromChar(CHAR);
            const encryption = TestUtils.EncryptContent(CHAR, expectedHash);

            // Call the function that stores the dummy encryption
            await decxRegistryContract.addCharacterHash(CHAR);

            // Retrieve the stored encryption
            const storedEncryption = await decxRegistryContract.EncryptedContent(expectedHash);

            // Verify that the stored encryption matches the expected dummy encryption
            expect(storedEncryption).to.equal(encryption);
        });

        it("Should not emit ContentEncrypted and EncryptionPathCreated events for a duplicate character", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Call the addCharacterHash function and wait for the transaction receipt
            await decxRegistryContract.addCharacterHash(CHAR);

            // Call the addCharacterHash function again to use the character again
            const tx = await decxRegistryContract.addCharacterHash(CHAR);
            const receipt = await tx.wait();

            // Ensure the ContentEncrypted event was not emitted
            const contentEncryptedEvent = receipt.logs?.find((log: any) => log.fragment.name === "ContentEncrypted");
            expect(contentEncryptedEvent).to.not.exist;

            // Ensure the EncryptionPathCreated event was not emitted
            const encryptionPathCreatedEvent = receipt.logs?.find(
                (log: any) => log.fragment.name === "EncryptionPathCreated"
            );
            expect(encryptionPathCreatedEvent).to.not.exist;
        });
    });
});
