import { expect } from "chai";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { DEKService } from "../services/dEKService";
import { ECIESService } from "../services/encryption/ECIESService";
import * as secp from "@noble/secp256k1";
import { Contract, EventLog } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Setup chai-as-promised
chai.use(chaiAsPromised);

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
        timeoutMs: number = 30000
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

    // // Basic tests that verify core functionality with fresh transactions
    // describe("Basic Operations", function () {
    //     it("should handle multi-byte UTF-8 characters", async function () {
    //         const { dEKService } = await loadFixture(deployFixture);
    //         const testString = "🌎";

    //         const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
    //         const decrypted = await dEKService.release(result.finalHash);
    //         expect(decrypted).to.equal(testString);
    //     });
    // });

    // Tests that verify transaction status functionality
    describe("Transaction Status", function () {
        it("should return a valid transaction hash and status", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const testString = "Hi";

            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);
            expect(result.transactionHash).to.match(/^0x[0-9a-f]{64}$/i);

            const status = await dEKService.checkTransactionStatus(result.transactionHash);
            expect(status.status).to.be.oneOf(["pending", "success", "failed"]);

            if (status.status === "success") {
                expect(status).to.have.property("blockNumber");
                expect(status).to.have.property("gasUsed");
            }
        });
    });

    // Tests that operate on an existing hash
    describe("Operations on Existing Hash", function () {
        let testHash: string;
        let dEKService: DEKService;
        let decxDAGContract: Contract;
        let signer: SignerWithAddress;

        before(async function () {
            const fixture = await loadFixture(deployFixture);
            dEKService = fixture.dEKService;
            decxDAGContract = fixture.decxDAGContract;
            signer = fixture.signer;

            // Press a test string and wait for it to complete
            const testString = "abc";
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);

            // Wait for transaction to complete and events to be available
            await waitForTransactionAndEvents(dEKService, result.transactionHash, 5); // 3 leaves + 2 internal pairs

            testHash = result.finalHash;
        });

        // it("should maintain character order during encryption and decryption", async function () {
        //     const decrypted = await dEKService.release(testHash);
        //     expect(decrypted).to.equal("abc");
        // });

        // it("should process EncryptionPathCreated events in correct order", async function () {
        //     const filter = decxDAGContract.filters.EncryptionPathCreated();
        //     const events = await decxDAGContract.queryFilter(filter);

        //     // Verify events are in correct order by pathIndex
        //     for (let i = 0; i < events.length - 1; i++) {
        //         const currentEvent = events[i] as EventLog;
        //         const nextEvent = events[i + 1] as EventLog;
        //         expect(currentEvent.args.index).to.be.lessThan(nextEvent.args.index);
        //     }
        // });

        // it("should emit correct number of EncryptedDataStored events", async function () {
        //     const events = await decxDAGContract.queryFilter(decxDAGContract.filters.EncryptedDataStored());
        //     expect(events.length).to.equal(5); // 3 leaves + 2 internal pairs
        // });
    });

    // Error handling tests
    describe("Error Handling", function () {
        it("should fail to decrypt with invalid hash", async function () {
            const { dEKService } = await loadFixture(deployFixture);
            const invalidHash = "0x" + "1".repeat(64);
            await expect(dEKService.release(invalidHash)).to.be.rejectedWith(
                "No encrypted data found for hash 0x1111111111111111111111111111111111111111111111111111111111111111"
            );
        });

        it("should fail to decrypt tampered encrypted data", async function () {
            const { dEKService, decxDAGContract } = await loadFixture(deployFixture);
            const testString = "Hi";
            const result = await dEKService.press(testString, undefined, false, TEST_GAS_LIMIT);

            const tamperedData = ethers.toUtf8Bytes("tampered-data");
            await expect(decxDAGContract.storeEncryptedData(result.finalHash, tamperedData))
                .to.emit(decxDAGContract, "EncryptedDataStored")
                .withArgs(result.finalHash, tamperedData);

            await expect(dEKService.release(result.finalHash)).to.be.rejectedWith("Invalid encrypted data format");
        });
    });
});
