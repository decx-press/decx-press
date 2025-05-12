import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { DEKService } from "../services/dEKService";
import { ECIESService } from "../services/encryption/ECIESService";
import * as secp from "@noble/secp256k1";
import { EventLog } from "ethers";

describe("DEKService", function () {
    // Test key pair for encryption/decryption
    const privateKey = "0x" + "1".repeat(64); // Simple test private key
    const publicKey = "0x" + Buffer.from(secp.getPublicKey(privateKey.slice(2), false)).toString("hex");

    // Configure higher gas limits for testing
    const TEST_GAS_LIMIT = 2000000; // 2M gas limit for tests

    // Helper function to wait for transaction completion and events
    async function waitForTransactionAndEvents(
        dEKService: DEKService,
        txHash: string,
        expectedEventCount: number,
        timeoutMs: number = 0
    ): Promise<void> {
        const startTime = Date.now();
        const checkInterval = 1000; // Check every second

        while (Date.now() - startTime < timeoutMs) {
            const status = await dEKService.checkTransactionStatus(txHash);

            if (status.status === "failed") {
                throw new Error("Transaction failed");
            }

            if (status.status === "success") {
                // Get the contract from the service
                const contract = dEKService["decxDAG"];
                const events = await contract.queryFilter(contract.filters.EncryptedDataStored());

                if (events.length >= expectedEventCount) {
                    return; // Success! We found all expected events
                }
            }

            // Wait before next check
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
        }

        throw new Error(`Timeout waiting for transaction and events after ${timeoutMs}ms`);
    }

    async function deployFixture() {
        // Get the signer (wallet) that will be used for transactions
        const [signer] = await ethers.getSigners();

        // Deploy the contracts
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();

        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const decxRegistryContract = await DecxRegistry.deploy(utf8ValidatorContract.target);

        const DecxDAG = await ethers.getContractFactory("DecxDAG");
        const decxDAGContract = await DecxDAG.deploy(decxRegistryContract.target);

        // Create the services
        const eciesService = new ECIESService(privateKey);
        const dEKService = new DEKService(decxDAGContract, eciesService, publicKey);

        return { decxDAGContract, dEKService, signer };
    }

    describe("Content Encryption", function () {
        it("should successfully encrypt and decrypt a simple string", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "Hi";

            // Encrypt the content with higher gas limit
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
            expect(result.finalHash)
                .to.be.a("string")
                .and.to.match(/^0x[0-9a-f]{64}$/i);

            // Decrypt the content
            const decrypted = await dEKService.release(result.finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should handle multi-byte UTF-8 characters", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "Hi 🌎"; // Reduced string length

            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
            const decrypted = await dEKService.release(result.finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should maintain character order during encryption and decryption", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "ABC"; // Reduced string length

            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
            const decrypted = await dEKService.release(result.finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should handle repeated characters correctly", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "aaa"; // Reduced string length

            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
            const decrypted = await dEKService.release(result.finalHash);
            expect(decrypted).to.equal(testString);
        });
    });

    describe("Error Handling", function () {
        it("should fail to decrypt with invalid hash", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const invalidHash = "0x" + "1".repeat(64);
            await expect(dEKService.release(invalidHash)).to.be.revertedWith(
                "No encrypted data found for hash 0x1111111111111111111111111111111111111111111111111111111111111111"
            );
        });

        it("should fail to decrypt tampered encrypted data", async function () {
            const { dEKService, decxDAGContract } = await loadFixture(deployFixture);
            const testString = "Hi";
            // Encrypt normally
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
            // Try to store tampered data for the same hash
            const tamperedData = ethers.toUtf8Bytes("tampered-data");
            await expect(decxDAGContract.storeEncryptedData(result.finalHash, tamperedData))
                .to.emit(decxDAGContract, "EncryptedDataStored")
                .withArgs(result.finalHash, tamperedData);
            // Attempt to decrypt should fail
            await expect(dEKService.release(result.finalHash)).to.be.revertedWith("Invalid encrypted data format");
        });
    });

    describe("Event Processing", function () {
        it("should process EncryptionPathCreated events in correct order", async function () {
            const { dEKService, decxDAGContract } = await loadFixture(deployFixture);
            const testString = "ab"; // Simple 2-character string
            // Press the content
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
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
            const decrypted = await dEKService.release(result.finalHash);
            expect(decrypted).to.equal(testString);
        });

        it("should emit EncryptedDataStored events for all components", async function () {
            const { decxDAGContract, dEKService, signer } = await loadFixture(deployFixture);
            const testString = "ab"; // 2 characters --> 2 leaves + 1 internal pairs = 3 stored events
            const expectedEventCount = 3;

            // Verify the signer has a valid address
            expect(signer.address).to.match(/^0x[0-9a-f]{40}$/i);

            // Get initial event count
            const initialEvents = await decxDAGContract.queryFilter(decxDAGContract.filters.EncryptedDataStored());
            const initialCount = initialEvents.length;

            // Press the content using the service
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);

            // Verify the transaction was sent from our signer
            const tx = await ethers.provider.getTransaction(result.transactionHash);
            expect(tx?.from).to.equal(signer.address);

            // Wait for transaction to complete and events to be available
            await waitForTransactionAndEvents(dEKService, result.transactionHash, initialCount + expectedEventCount);

            // Get final event count
            const finalEvents = await decxDAGContract.queryFilter(decxDAGContract.filters.EncryptedDataStored());
            expect(finalEvents.length - initialCount).to.equal(expectedEventCount);
        });
    });

    describe("Transaction Status", function () {
        it("should return a valid transaction hash and status", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "Hi";

            // Press the content
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);

            // Verify transaction hash format
            expect(result.transactionHash)
                .to.be.a("string")
                .and.to.match(/^0x[0-9a-f]{64}$/i);

            // Check transaction status
            const status = await dEKService.checkTransactionStatus(result.transactionHash);

            // Verify status is one of the expected values
            expect(status.status).to.be.oneOf(["pending", "success", "failed"]);

            // If we got a status, it should include the expected fields
            if (status.status === "success") {
                expect(status).to.have.property("blockNumber");
                expect(status).to.have.property("gasUsed");
            }
        });
    });
});
