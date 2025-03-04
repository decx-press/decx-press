import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { DecxPressService } from "../services/dEKService";
import { ECIESService } from "../services/encryption/ECIESService";
import * as secp from "@noble/secp256k1";
import { EventLog } from "ethers";

describe("dEKService", function () {
    // Test key pair for encryption/decryption
    const privateKey = "0x" + "1".repeat(64); // Simple test private key
    const publicKey = "0x" + Buffer.from(secp.getPublicKey(privateKey.slice(2), false)).toString("hex");

    async function deployFixture() {
        // Deploy the contracts
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();

        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const decxRegistryContract = await DecxRegistry.deploy(utf8ValidatorContract.target);

        const DecxDAG = await ethers.getContractFactory("DecxDAG");
        const decxDAGContract = await DecxDAG.deploy(decxRegistryContract.target);

        // Create the services
        const eciesService = new ECIESService(privateKey);
        const dEKService = new DecxPressService(decxDAGContract, eciesService, publicKey);

        return { decxDAGContract, dEKService };
    }

    describe("Content Encryption", function () {
        it("should successfully encrypt and decrypt a simple string", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "Hello, World!";

            // Encrypt the content
            const finalHash = await dEKService.press(testString);
            expect(finalHash)
                .to.be.a("string")
                .and.to.match(/^0x[0-9a-f]{64}$/i);

            // Decrypt the content
            const decrypted = await dEKService.release(finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should handle multi-byte UTF-8 characters", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "Hello 👋 World 🌍!";

            const finalHash = await dEKService.press(testString);
            const decrypted = await dEKService.release(finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should maintain character order during encryption and decryption", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            const finalHash = await dEKService.press(testString);
            const decrypted = await dEKService.release(finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should handle repeated characters correctly", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "aaa bbb ccc";

            const finalHash = await dEKService.press(testString);
            const decrypted = await dEKService.release(finalHash);
            expect(decrypted).to.equal(testString);
        });
    });

    describe("Error Handling", function () {
        it("should fail to decrypt with invalid hash", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const invalidHash = "0x" + "1".repeat(64);
            await expect(dEKService.release(invalidHash)).to.be.rejectedWith(
                Error,
                "No encrypted data found for hash 0x1111111111111111111111111111111111111111111111111111111111111111"
            );
        });
        it("should fail to decrypt tampered encrypted data", async function () {
            const { dEKService, decxDAGContract } = await loadFixture(deployFixture);
            const testString = "Hello";
            // Encrypt normally
            const finalHash = await dEKService.press(testString);
            // Try to store tampered data for the same hash
            const tamperedData = ethers.toUtf8Bytes("tampered-data");
            await expect(decxDAGContract.storeEncryptedData(finalHash, tamperedData))
                .to.emit(decxDAGContract, "EncryptedDataStored")
                .withArgs(finalHash, tamperedData);
            // Attempt to decrypt should fail
            await expect(dEKService.release(finalHash)).to.be.rejectedWith(Error, "Invalid encrypted data format");
        });
    });

    describe("Event Processing", function () {
        it("should process EncryptionPathCreated events in correct order", async function () {
            const { dEKService, decxDAGContract } = await loadFixture(deployFixture);
            const testString = "ab"; // Simple 2-character string
            // Press the content
            const finalHash = await dEKService.press(testString);
            // Get all EncryptionPathCreated events
            const filter = decxDAGContract.filters.EncryptionPathCreated();
            const events = await decxDAGContract.queryFilter(filter);
            // Verify events are in correct order by pathIndex
            for (let i = 0; i < events.length - 1; i++) {
                const currentEvent = events[i] as EventLog;
                const nextEvent = events[i + 1] as EventLog;
                expect(currentEvent.args.index).to.be.lessThan(nextEvent.args.index);
            }
            // Verify we can still decrypt correctly
            const decrypted = await dEKService.release(finalHash);
            expect(decrypted).to.equal(testString);
        });
        it("should emit EncryptedDataStored events for all components", async function () {
            const { decxDAGContract, dEKService } = await loadFixture(deployFixture);
            const testString = "abc"; // 3 characters --> 3 leaves + 2 internal pairs = 5 stored events

            // Get initial event count
            const initialEvents = await decxDAGContract.queryFilter(decxDAGContract.filters.EncryptedDataStored());

            // Press the content using the service (NOT the contract directly)
            const finalHash = await dEKService.press(testString);

            // Get final event count
            const finalEvents = await decxDAGContract.queryFilter(decxDAGContract.filters.EncryptedDataStored());

            // We expect 5 new events
            expect(finalEvents.length - initialEvents.length).to.equal(5);
        });
    });
});
