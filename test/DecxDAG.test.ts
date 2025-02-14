import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TestUtils } from "./TestUtils";

const OLD_MAN1 = `The old man was thin and gaunt with deep wrinkles in the back of his neck. The brown blotches of the benevolent skin cancer the sun brings from its reflection on the tropic sea were on his cheeks. The blotches ran well down the sides of his face and his hands had the deep-creased scars from handling heavy fish on the cords. But none of these scars were fresh. They were as old as erosions in a fishless desert. Everything about him was old except his eyes and they were the same color as the sea and were cheerful and undefeated. `;
const OLD_MAN2 = `Santiago, the boy said to him as they climbed the bank from where the skiff was hauled up. I could go with you again. We've made some money. The old man had taught the boy to fish and the boy loved him. No, the old man said. You're with a lucky boat. Stay with them. But remember how you went eighty-seven days without fish and then we caught big ones every day for three weeks. I remember, the old man said. I know you did not leave me because you doubted. It was papa made me leave. I am a boy and I must obey him. I know, the old man said. `;

// At the top with other constants
const isCoverage = process.env.COVERAGE === "true";

describe("DecxDAG", function () {
    async function deployDecxDAGFixture() {
        const HashRegistry = await ethers.getContractFactory("HashRegistry");
        const hashRegistryContract = await HashRegistry.deploy();

        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();

        const Character2Hash = await ethers.getContractFactory("Character2Hash");
        const character2HashContract = await Character2Hash.deploy(
            hashRegistryContract.target,
            utf8ValidatorContract.target
        );

        const Hashes2Hash = await ethers.getContractFactory("Hashes2Hash");
        const hashes2HashContract = await Hashes2Hash.deploy(hashRegistryContract.target);

        const DecxDAG = await ethers.getContractFactory("DecxDAG");
        const decxDAGContract = await DecxDAG.deploy(character2HashContract.target, hashes2HashContract.target);

        return { decxDAGContract, character2HashContract, hashes2HashContract, hashRegistryContract };
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

            // print the gas fees
            await TestUtils.PrintGasFees([receipt1, receipt2, receipt3]);

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
                // print the gas fees
                await TestUtils.PrintGasFees([receipt1, receipt2, receipt3, receipt4, receipt5]);

                // Confirm intuitively that the more novel hashing, the more gas used
                expect(receipt3.gasUsed).to.be.lessThan(receipt1.gasUsed);
                expect(receipt4.gasUsed).to.be.lessThan(receipt2.gasUsed);
                expect(receipt5.gasUsed).to.be.lessThan(receipt1.gasUsed);
                expect(receipt3.gasUsed).to.be.lessThan(receipt5.gasUsed);
            }
        );

        // Skip extremely long strings gas optimization test during coverage
        (isCoverage ? it.skip : it)("should optimize gas when storing extremely long strings", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);
            const str1 = OLD_MAN1;
            const str2 = OLD_MAN2;

            const tx1 = await decxDAGContract.press(str1);
            const receipt1 = await tx1.wait();

            const tx2 = await decxDAGContract.press(str2);
            const receipt2 = await tx2.wait();

            const tx1_2 = await decxDAGContract.press(str1 + str2);
            const receipt1_2 = await tx1_2.wait();

            const tx3 = await decxDAGContract.press(str1);
            const receipt3 = await tx3.wait();

            const tx4 = await decxDAGContract.press(str2);
            const receipt4 = await tx4.wait();

            const tx3_4 = await decxDAGContract.press(str1 + str2);
            const receipt3_4 = await tx3_4.wait();

            const tx5 = await decxDAGContract.press(str1);
            const receipt5 = await tx5.wait();

            const tx6 = await decxDAGContract.press(str2);
            const receipt6 = await tx6.wait();

            const tx5_6 = await decxDAGContract.press(str1 + str2);
            const receipt5_6 = await tx5_6.wait();

            // Set operation descriptions
            receipt1.operation = `1st hashing part 1 (500+ characters)`;
            receipt2.operation = `1st hashing part 2 (500+ characters)`;
            receipt1_2.operation = `1st hashing parts 1 and 2 (1000+ characters)`;
            receipt3.operation = `2nd hashing part 1 (500+ characters)`;
            receipt4.operation = `2nd hashing part 2 (500+ characters)`;
            receipt3_4.operation = `2nd hashing parts 1 and 2 (1000+ characters)`;
            receipt5.operation = `3rd hashing part 1 (500+ characters)`;
            receipt6.operation = `3rd hashing part 2 (500+ characters)`;
            receipt5_6.operation = `3rd hashing parts 1 and 2 (1000+ characters)`;

            await TestUtils.PrintGasFees([
                receipt1,
                receipt2,
                receipt1_2,
                receipt3,
                receipt4,
                receipt3_4,
                receipt5,
                receipt6,
                receipt5_6
            ]);

            // Verify gas optimizations
            expect(receipt1.gasUsed).to.be.greaterThan(receipt3.gasUsed);
            expect(receipt2.gasUsed).to.be.greaterThan(receipt4.gasUsed);
            expect(receipt1_2.gasUsed).to.be.greaterThan(receipt3_4.gasUsed);
            expect(receipt4.gasUsed).to.be.equal(receipt6.gasUsed);
            expect(receipt3.gasUsed).to.be.equal(receipt5.gasUsed);
            expect(receipt3_4.gasUsed).to.be.equal(receipt5_6.gasUsed);
        });
    });
});
