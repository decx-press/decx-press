import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "./TestUtils";

// Use a single character string for testing
const CHAR1 = "a";
const CHAR2 = "b";
const INVALID_HASH_ERROR = "DecxRegistry_InvalidHash";
const ZERO_HASH_ERROR = "DecxRegistry_ZeroHashNotAllowed";
const isCoverage = process.env.COVERAGE === "true";

describe("DecxRegistry", function () {
    // Define a fixture for consistent setup across tests
    async function deployDecxRegistryFixture() {
        // Deploy UTF8Validator first
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();

        // Then deploy the DecxRegistry contract
        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const decxRegistryContract = await DecxRegistry.deploy(utf8ValidatorContract.target);

        return { decxRegistryContract, utf8ValidatorContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Check that the contract has a valid address
            expect(decxRegistryContract.target).to.be.properAddress;
        });
    });

    describe("Character validation and hashing", function () {
        it("should successfully add a valid ASCII character and return its hash", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const character = "A";
            const tx = await decxRegistryContract.addCharacterHash(character);
            const receipt = await tx.wait();

            // Verify the hash is stored in DecxRegistry
            const storedHash = await decxRegistryContract.getHashForCharacter(character);
            expect(storedHash).to.not.equal(ethers.ZeroHash);
        });

        it("should successfully add a valid UTF-8 character and return its hash", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const character = "🚀"; // 4-byte UTF-8 character
            const tx = await decxRegistryContract.addCharacterHash(character);
            const receipt = await tx.wait();

            // Verify the hash is stored in DecxRegistry
            const storedHash = await decxRegistryContract.getHashForCharacter(character);
            expect(storedHash).to.not.equal(ethers.ZeroHash);
        });
    });

    describe("Hash Storage and Lookup", function () {
        it("should reject zero hash", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            await decxRegistryContract.addCharacterHash(CHAR1);
            const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR1);
            const zeroHash = ethers.ZeroHash;

            // expect the first hash to be rejected
            await expect(decxRegistryContract.addHashesHash([zeroHash, atomicHash1])).to.be.revertedWithCustomError(
                decxRegistryContract,
                ZERO_HASH_ERROR
            );

            // expect the second hash to be rejected
            await expect(decxRegistryContract.addHashesHash([atomicHash1, zeroHash])).to.be.revertedWithCustomError(
                decxRegistryContract,
                ZERO_HASH_ERROR
            );

            // expect both hashes to be rejected
            await expect(decxRegistryContract.addHashesHash([zeroHash, zeroHash])).to.be.revertedWithCustomError(
                decxRegistryContract,
                ZERO_HASH_ERROR
            );
        });

        it("should store a single UTF Character", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const hash = TestUtils.GenerateHashFromChar(CHAR1);

            // Add the Character2Hash unit
            await decxRegistryContract.addCharacterHash(CHAR1);

            // Check that the hash exists
            const exists = await decxRegistryContract.isHashPresent(hash);
            expect(exists).to.be.true;

            // Check reverse lookup
            const storedHash = await decxRegistryContract.getHashForCharacter(CHAR1);
            expect(storedHash).to.equal(hash);
        });

        it("Should store and return consistent hashes", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const tx1 = await decxRegistryContract.addCharacterHash(CHAR1);
            const tx2 = await decxRegistryContract.addCharacterHash(CHAR1);

            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();

            expect(receipt1.data).to.equal(receipt2.data);
        });

        it("Should return the existing hash for duplicate Character Hashes", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Add the first Character2Hash unit
            await decxRegistryContract.addCharacterHash(CHAR1);

            // Extract the emitted hash
            const hash1 = await decxRegistryContract.getHashForCharacter(CHAR1);

            // Check that the atomicLookupMapping is not zero for the added character
            expect(await decxRegistryContract.getHashForCharacter(CHAR1)).to.not.equal(ethers.ZeroHash);
            expect(hash1).to.not.equal(ethers.ZeroHash); // Ensure the returned hash is also not zero

            // Add the same Character2Hash unit again
            await decxRegistryContract.addCharacterHash(CHAR1);

            // Extract the returned hash
            const hash2 = await decxRegistryContract.getHashForCharacter(CHAR1);

            // Verify that the hashes are the same
            expect(hash1).to.equal(hash2);
        });

        it("Should store two hashes", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

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
            const tx = await decxRegistryContract.addHashesHash(atomicHashes);
            await tx.wait();

            // Get the hash from the decxregistry
            const generatedHash = await decxRegistryContract.getHashForHashes(atomicHashes);

            // Calculate the expected hash the same way the contract does
            const expectedHash = TestUtils.GenerateHashFromHashes(atomicHashes);

            // Check that the hash is the same as the expected hash
            expect(generatedHash).to.equal(expectedHash);

            // Check that the hash exists
            const exists = await decxRegistryContract.isHashPresent(expectedHash);
            expect(exists).to.be.true;
        });
    });

    it("Should return the existing hash for duplicate Hash Hashes", async function () {
        const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

        // Add the first Character2Hash unit
        await decxRegistryContract.addCharacterHash(CHAR1);

        // Extract the emitted hash
        const charHash = await decxRegistryContract.getHashForCharacter(CHAR1);

        await decxRegistryContract.addHashesHash([charHash, charHash]);

        const hash2hashes1 = await decxRegistryContract.getHashForHashes([charHash, charHash]);

        const hash2hashes2 = await decxRegistryContract.getHashForHashes([charHash, charHash]);

        // Verify that the hashes are the same
        expect(hash2hashes1).to.equal(hash2hashes2);
    });

    it("Should not allow invalid hash pairs", async function () {
        const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

        // First add the Character2Hash unit
        await decxRegistryContract.addCharacterHash(CHAR1);
        const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR1);

        // Create a fake hash that's the right format but not registered in Character2Hash
        const fakeHash = "0x" + "1".repeat(64); // Creates a valid bytes32 hex string

        await expect(decxRegistryContract.addHashesHash([atomicHash1, fakeHash])).to.be.revertedWithCustomError(
            decxRegistryContract,
            INVALID_HASH_ERROR
        );

        await expect(decxRegistryContract.addHashesHash([fakeHash, atomicHash1])).to.be.revertedWithCustomError(
            decxRegistryContract,
            INVALID_HASH_ERROR
        );

        await expect(decxRegistryContract.addHashesHash([fakeHash, fakeHash])).to.be.revertedWithCustomError(
            decxRegistryContract,
            INVALID_HASH_ERROR
        );
    });

    describe("Encryption Storage and Events", function () {
        it("Should emit ContentEncrypted and EncryptionPathCreated events for a single character", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
            const hash = TestUtils.GenerateHashFromChar(CHAR1);

            // Call the addCharacterHash function and wait for the transaction receipt
            const tx = await decxRegistryContract.addCharacterHash(CHAR1);
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
            const expectedHash = TestUtils.GenerateHashFromChar(CHAR1);
            const encryption = TestUtils.EncryptContent(CHAR1, expectedHash);

            // Call the function that stores the dummy encryption
            await decxRegistryContract.addCharacterHash(CHAR1);

            // Retrieve the stored encryption
            const storedEncryption = await decxRegistryContract.EncryptedContent(expectedHash);

            // Verify that the stored encryption matches the expected dummy encryption
            expect(storedEncryption).to.equal(encryption);
        });

        it("Should not emit ContentEncrypted and EncryptionPathCreated events for a duplicate character", async function () {
            const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

            // Call the addCharacterHash function and wait for the transaction receipt
            await decxRegistryContract.addCharacterHash(CHAR1);

            // Call the addCharacterHash function again to use the character again
            const tx = await decxRegistryContract.addCharacterHash(CHAR1);
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

    describe("Gas Optimization", function () {
        // Skip gas optimization tests during coverage
        (isCoverage ? it.skip : it)(
            "Should optimize gas usage by avoiding duplicate hashing for characters",
            async function () {
                const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);
                const tx1 = await decxRegistryContract.addCharacterHash(CHAR1);
                const receipt1 = await tx1.wait();

                const tx2 = await decxRegistryContract.addCharacterHash(CHAR1);
                const receipt2 = await tx2.wait();

                receipt1.operation = `novel hashing of "${CHAR1}"`;
                receipt2.operation = `hashing attempt of "${CHAR1}"`;

                if (process.env.PRINT_FEES === "true") {
                    await TestUtils.PrintGasFees([receipt1, receipt2]);
                }

                expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
            }
        );

        // Skip gas optimization tests during coverage
        (isCoverage ? it.skip : it)(
            "Should optimize gas usage by avoiding duplicate hashing for hash pairs",
            async function () {
                const { decxRegistryContract } = await loadFixture(deployDecxRegistryFixture);

                // Add Character2Hash units and get their hashes
                await decxRegistryContract.addCharacterHash(CHAR1);
                await decxRegistryContract.addCharacterHash(CHAR2);

                // Get the actual Character2Hash unit hashes using getHashForCharacter
                const atomicHash1 = await decxRegistryContract.getHashForCharacter(CHAR1);
                const atomicHash2 = await decxRegistryContract.getHashForCharacter(CHAR2);
                const atomicHashes = [atomicHash1, atomicHash2];

                // Add a hashes2hash
                const tx1 = await decxRegistryContract.addHashesHash(atomicHashes);
                const receipt1 = await tx1.wait();

                // Add the same hashes2hash again
                const tx2 = await decxRegistryContract.addHashesHash(atomicHashes);
                const receipt2 = await tx2.wait();

                // assign the same operation to both receipts
                receipt1.operation = `novel hashing of "${CHAR1}${CHAR2}"`;
                receipt2.operation = `hashing attempt of "${CHAR1}${CHAR2}"`;

                if (process.env.PRINT_FEES === "true") {
                    await TestUtils.PrintGasFees([receipt1, receipt2]);
                }

                // Confirm no additional storage occurred by ensuring the gas cost is minimal
                expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
            }
        );
    });
});
