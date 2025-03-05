import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TestUtils } from "./TestUtils";

const OLD_MAN = `The old man was thin and gaunt with deep wrinkles in the back of his neck. The brown blotches of the benevolent skin cancer the sun brings from its reflection on the tropic sea were on his cheeks. The blotches ran well down the sides of his face and his hands had the deep-creased scars from handling heavy fish on the cords. But none of these scars were fresh. They were as old as erosions in a fishless desert. Everything about him was old except his eyes and they were the same color as the sea and were cheerful and undefeated. `;

// At the top with other constants
const isCoverage = process.env.COVERAGE === "true";

describe("DecxDAG", function () {
    async function deployDecxDAGFixture() {
        // Deploy UTF8Validator first
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();

        // Deploy DecxRegistry with UTF8Validator
        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const decxRegistryContract = await DecxRegistry.deploy(utf8ValidatorContract.target);

        // Deploy DecxDAG with DecxRegistry
        const DecxDAG = await ethers.getContractFactory("DecxDAG");
        const decxDAGContract = await DecxDAG.deploy(decxRegistryContract.target);

        return { decxDAGContract, utf8ValidatorContract, decxRegistryContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
            expect(decxDAGContract.target).to.be.properAddress;
        });
    });

    describe("Input Validation", function () {
        it("should reject empty strings", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
            await expect(decxDAGContract.press("")).to.be.revertedWithCustomError(
                decxDAGContract,
                "DecxDAG_EmptyStringNotAllowed"
            );
        });
    });

    describe("DAG Construction", function () {
        it("should handle strings with odd number of characters", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
            const STRING = isCoverage ? "abc" : "Hello World"; // 3 or 11 characters
            const tx = await decxDAGContract.press(STRING);
            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);
        });

        it("should produce consistent hashes for the same input", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
            const STRING = isCoverage ? "test" : "Hello, World!";

            // Call press() and wait for the transactions
            const tx1 = await decxDAGContract.press(STRING);
            const tx2 = await decxDAGContract.press(STRING);

            // Get the actual hash values from the transactions
            const hash1 = await tx1.wait();
            const hash2 = await tx2.wait();

            // Compare the returned data (the actual hash values)
            expect(hash1.data).to.equal(hash2.data);
        });
    });

    describe("Storage and Lookup", function () {
        it("should store the same data for the same string in different transactions", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            // Use shorter string for coverage
            const STRING = isCoverage ? "jumpy fox." : "jumpy dwarf foxes blitz quickly in a night vex.";

            const tx1 = await decxDAGContract.press(STRING);
            const receipt1 = await tx1.wait();

            const tx2 = await decxDAGContract.press(STRING);
            const receipt2 = await tx2.wait();

            // the payloads should be the same
            expect(receipt1.data).to.equal(receipt2.data);
            expect(receipt1.hash).to.not.equal(receipt2.hash);
        });

        it("should store mixed multi-byte and single-byte characters", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            // Use shorter strings for coverage
            const STRING1 = isCoverage ? "Hi!" : "Hello, world!";
            const STRING2 = isCoverage ? "Hi😀!" : "Hell😀, w😀rld!";
            const STRING3 = isCoverage ? "höla" : "hello, wörld!";
            const STRING4 = isCoverage ? "Hḹ!" : "Heḹḹợ, woṝḹḑ";

            // press strings and verify they don't revert
            await expect(decxDAGContract.press(STRING1)).to.not.be.reverted;
            await expect(decxDAGContract.press(STRING2)).to.not.be.reverted;
            await expect(decxDAGContract.press(STRING3)).to.not.be.reverted;
            await expect(decxDAGContract.press(STRING4)).to.not.be.reverted;

            // verify the transaction receipts
            const tx1 = await decxDAGContract.press(STRING1);
            const tx2 = await decxDAGContract.press(STRING2);
            const tx3 = await decxDAGContract.press(STRING3);
            const tx4 = await decxDAGContract.press(STRING4);
            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();
            const receipt3 = await tx3.wait();
            const receipt4 = await tx4.wait();

            // verify receipts exist
            expect(receipt1).to.not.be.null;
            expect(receipt2).to.not.be.null;
            expect(receipt3).to.not.be.null;
            expect(receipt4).to.not.be.null;

            // verify transaction hashes are valid 32-byte hex strings
            expect(receipt1.hash).to.match(/^0x[0-9a-f]{64}$/i);
            expect(receipt2.hash).to.match(/^0x[0-9a-f]{64}$/i);
            expect(receipt3.hash).to.match(/^0x[0-9a-f]{64}$/i);
            expect(receipt4.hash).to.match(/^0x[0-9a-f]{64}$/i);

            // also just check the transaction was successful
            expect(receipt1.status).to.equal(1);
            expect(receipt2.status).to.equal(1);
            expect(receipt3.status).to.equal(1);
            expect(receipt4.status).to.equal(1);
        });
    });

    describe("Gas Optimization", function () {
        // Skip basic gas optimization test during coverage
        (isCoverage ? it.skip : it)("Should optimize gas usage by avoiding duplicate hashing", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            const STRING1 = "Hello, world!";
            const STRING2 = "hello, world!";

            // Add a hashes2hash
            const tx1 = await decxDAGContract.press(STRING1);
            const receipt1 = await tx1.wait();

            // Add the same hashes2hash again
            const tx2 = await decxDAGContract.press(STRING1);
            const receipt2 = await tx2.wait();

            // Add a slightly different string
            const tx3 = await decxDAGContract.press(STRING2);
            const receipt3 = await tx3.wait();

            // assign the same operation to both receipts
            receipt1.operation = `novel hashing of "${STRING1}"`;
            receipt2.operation = `hashing attempt of "${STRING1}"`;
            receipt3.operation = `hashing attempt of "${STRING2}"`;

            if (process.env.PRINT_FEES === "true") {
                await TestUtils.PrintGasFees([receipt1, receipt2, receipt3]);
            }

            // Confirm no additional storage occurred by ensuring the gas cost is minimal
            expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
        });

        // Skip longer strings gas optimization test during coverage
        (isCoverage ? it.skip : it)(
            "should optimize gas usage by avoiding duplicate hashing for longer strings",
            async function () {
                const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

                // Use shorter strings for coverage
                const STRING1 = "JUMPY DWARF FOXES BLITZ QUICKLY IN A NIGHT VEX!";
                const STRING2 = "jumpy dwarf foxes blitz quickly in a night vex.";
                // reusing characters and hashes from STRING1 and STRING2
                const STRING3 = "INKLY KLARF JUICY QUIG VIC!";
                const STRING4 = "inkly klarf juicy quig vic.";
                // reusing characters from STRING1 but novel hashing
                const STRING5 = "WOOO!!! LETS GO!!!! MAHOMES BABY!!";

                // Add a hashes2hash
                const tx1 = await decxDAGContract.press(STRING1);
                const receipt1 = await tx1.wait();

                // Add the same hashes2hash again
                const tx2 = await decxDAGContract.press(STRING2);
                const receipt2 = await tx2.wait();

                // Add a slightly different string
                const tx3 = await decxDAGContract.press(STRING3);
                const receipt3 = await tx3.wait();

                // Add a slightly different string
                const tx4 = await decxDAGContract.press(STRING4);
                const receipt4 = await tx4.wait();

                // Add a slightly different string
                const tx5 = await decxDAGContract.press(STRING5);
                const receipt5 = await tx5.wait();

                // assign the same operation to both receipts
                receipt1.operation = `novel hashing of "${STRING1}"`;
                receipt2.operation = `novel hashing of "${STRING2}"`;
                receipt3.operation = `novel hashing of "${STRING3}"`;
                receipt4.operation = `novel hashing of "${STRING4}"`;
                receipt5.operation = `novel hashing of "${STRING5}"`;

                if (process.env.PRINT_FEES === "true") {
                    await TestUtils.PrintGasFees([receipt1, receipt2, receipt3, receipt4, receipt5]);
                }

                // Confirm intuitively that the more novel hashing, the more gas used
                expect(receipt3.gasUsed).to.be.lessThan(receipt1.gasUsed);
                expect(receipt4.gasUsed).to.be.lessThan(receipt2.gasUsed);
                expect(receipt5.gasUsed).to.be.lessThan(receipt1.gasUsed);
                expect(receipt3.gasUsed).to.be.lessThan(receipt5.gasUsed);
            }
        );

        // This test is not valid for coverage because it takes too long to run
        (isCoverage ? it.skip : it)(
            "should be able to bypass the 100k gas limit by incrementally building long strings",
            async function () {
                const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
                const sections = TestUtils.SplitIntoSections(OLD_MAN, 30); // Split OLD_MAN into 30 sections
                const gasLimit = 1000000;
                const receipts: any[] = [];
                let totalGasUsed = BigInt(0); // Use BigInt for total gas used

                // Incrementally build the entire excerpt starting with 30 sections, we won't print these receipts
                for (let i = 0; i < sections.length; i++) {
                    const tx = await decxDAGContract.press(sections[i]);
                    const receipt = await tx.wait();
                    totalGasUsed += BigInt(receipt.gasUsed); // Convert to BigInt
                }

                // Combine sections in a hierarchical manner
                let currentSections = sections;
                let sectionCount = 30;

                while (sectionCount > 1) {
                    const newSections: string[] = [];
                    for (let i = 0; i < currentSections.length; i += 2) {
                        if (i + 1 < currentSections.length) {
                            const combinedString = currentSections[i] + currentSections[i + 1];
                            const tx = await decxDAGContract.press(combinedString);
                            const receipt = await tx.wait();
                            receipts.push(receipt);
                            totalGasUsed += BigInt(receipt.gasUsed); // Convert to BigInt

                            // Emit the operation description for the combined section
                            receipt.operation = `Combined Section ${newSections.length + 1} (Sections ${i + 1} and ${i + 2})`;
                            newSections.push(combinedString);
                        } else {
                            // If there's an odd section out, just push it to the new sections
                            newSections.push(currentSections[i]);
                        }
                    }
                    currentSections = newSections; // Update current sections to the newly combined sections
                    sectionCount = currentSections.length; // Update the section count
                }

                if (process.env.PRINT_FEES === "true") {
                    await TestUtils.PrintGasFees(receipts);
                }

                // Print the total gas used for the final combination
                expect(totalGasUsed).to.be.greaterThan(BigInt(gasLimit));
            }
        );
    });

    describe("Encryption Path Events", function () {
        it("should emit EncryptionPathCreated events with incrementing pathIndex", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
            const testString = "ab"; // Simple 2-character string

            const tx = await decxDAGContract.press(testString);
            const receipt = await tx.wait();

            // Filter EncryptionPathCreated events
            const events = receipt.logs
                .filter((log: any) => log.fragment?.name === "EncryptionPathCreated")
                .map((log: any) => ({
                    hash: log.args.hash,
                    components: log.args.components,
                    index: log.args.index
                }));

            // Should have 3 events: 2 for characters and 1 for their combination
            expect(events).to.have.length(3);

            // Verify pathIndex increments
            expect(events[0].index).to.equal(0);
            expect(events[1].index).to.equal(1);
            expect(events[2].index).to.equal(2);

            // First two events should be character hashes with [hash, 0x0] components
            expect(events[0].components[1]).to.equal(ethers.ZeroHash);
            expect(events[1].components[1]).to.equal(ethers.ZeroHash);

            // Last event should combine the first two hashes
            expect(events[2].components[0]).to.equal(events[0].hash);
            expect(events[2].components[1]).to.equal(events[1].hash);
        });

        it("should maintain correct pathIndex across multiple press calls", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            // First press call
            const tx1 = await decxDAGContract.press("a");
            const receipt1 = await tx1.wait();

            // Second press call
            const tx2 = await decxDAGContract.press("b");
            const receipt2 = await tx2.wait();

            const events1 = receipt1.logs
                .filter((log: any) => log.fragment?.name === "EncryptionPathCreated")
                .map((log: any) => log.args.index);

            const events2 = receipt2.logs
                .filter((log: any) => log.fragment?.name === "EncryptionPathCreated")
                .map((log: any) => log.args.index);

            // First call should start at 0
            expect(events1[0]).to.equal(0);

            // Second call should continue from where first call left off
            expect(events2[0]).to.equal(1);
        });
    });

    describe("Encrypted Data Storage", function () {
        it("should emit EncryptedDataStored event with correct hash and payload", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            // First create a hash
            const tx = await decxDAGContract.press("a");
            const receipt = await tx.wait();

            // Get the hash from the EncryptionPathCreated event
            const event = receipt.logs.find((log: any) => log.fragment?.name === "EncryptionPathCreated");
            const hash = event.args.hash;

            // Store encrypted data
            const encryptedPayload = ethers.toUtf8Bytes("test-encrypted-data");
            const storeTx = await decxDAGContract.storeEncryptedData(hash, encryptedPayload);
            const storeReceipt = await storeTx.wait();

            // Find EncryptedDataStored event
            const storedEvent = storeReceipt.logs.find((log: any) => log.fragment?.name === "EncryptedDataStored");
            expect(storedEvent).to.exist;
            expect(storedEvent.args.hash).to.equal(hash);

            // Convert the event args from hex to Uint8Array for comparison
            const eventPayload = ethers.getBytes(storedEvent.args.encryptedPayload);
            expect(eventPayload).to.deep.equal(encryptedPayload);
        });

        it("should revert when storing encrypted data for non-existent hash", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
            const encryptedPayload = ethers.toUtf8Bytes("test-encrypted-data");

            await expect(
                decxDAGContract.storeEncryptedData(nonExistentHash, encryptedPayload)
            ).to.be.revertedWithCustomError(decxDAGContract, "DecxDAG_HashDoesNotExist");
        });
    });
});
