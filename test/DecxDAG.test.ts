import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TestUtils } from "./TestUtils";

const OLD_MAN1 = `The old man was thin and gaunt with deep wrinkles in the back of his neck. The brown blotches of the benevolent skin cancer the sun brings from its reflection on the tropic sea were on his cheeks. The blotches ran well down the sides of his face and his hands had the deep-creased scars from handling heavy fish on the cords. But none of these scars were fresh. They were as old as erosions in a fishless desert. Everything about him was old except his eyes and they were the same color as the sea and were cheerful and undefeated.`;
const OLD_MAN2 = `Santiago, the boy said to him as they climbed the bank from where the skiff was hauled up. I could go with you again. We've made some money. The old man had taught the boy to fish and the boy loved him. No, the old man said. You're with a lucky boat. Stay with them. But remember how you went eighty-seven days without fish and then we caught big ones every day for three weeks. I remember, the old man said. I know you did not leave me because you doubted. It was papa made me leave. I am a boy and I must obey him. I know, the old man said. It is quite normal. He hasn't much faith.  "No," the old man said. "But we have. Haven't we?" "Yes," the boy said. "Can I offer you a beer on the Terrace and then we'll take the stuff home." "Why not?" the old man said. "Between fishermen." They sat on the Terrace and many of the fishermen made fun of the old man and he was not angry. Others, of the older fishermen, looked at him and were sad. But they did not show it and they spoke politely about the current and the depths they had drifted their lines at and the steady good weather and of what they had seen. The successful fishermen of that day were already in and had butchered their marlin out and carried them laid full length across two planks, with two men staggering at the end of each plank, to the fish house where they waited for the ice truck to carry them to the market in Havana. Those who had caught sharks had taken them to the shark factory on the other side of the cove where they were hoisted on a block and tackle, their livers removed, their fins cut off and their hides skinned out and their flesh cut into strips for salting. When the wind was in the east a smell came across the harbour from the shark factory; but today there was only the faint edge of the odour because the wind had backed into the north and then dropped off and it was pleasant and sunny on the Terrace.`;

describe("DecxDAG", function () {
    async function deployDecxDAGFixture() {
        // Deploy HashRegistry
        const HashRegistry = await ethers.getContractFactory("HashRegistry");
        const hashRegistryContract = await HashRegistry.deploy();

        // Deploy Character2Hash
        const Character2Hash = await ethers.getContractFactory("Character2Hash");
        const character2HashContract = await Character2Hash.deploy(hashRegistryContract.target);

        // Deploy Hashes2Hash
        const Hashes2Hash = await ethers.getContractFactory("Hashes2Hash");
        const hashes2HashContract = await Hashes2Hash.deploy(hashRegistryContract.target);

        // Deploy DecxDAG with the addresses of the above contracts
        const DecxDAG = await ethers.getContractFactory("DecxDAG");
        const decxDAGContract = await DecxDAG.deploy(character2HashContract.target, hashes2HashContract.target);

        return { decxDAGContract, character2HashContract, hashes2HashContract, hashRegistryContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { decxDAGContract, character2HashContract, hashes2HashContract, hashRegistryContract } =
                await loadFixture(deployDecxDAGFixture);
            // Check that the contracts have a valid address
            expect(decxDAGContract.target).to.be.properAddress;
            expect(character2HashContract.target).to.be.properAddress;
            expect(hashes2HashContract.target).to.be.properAddress;
            expect(hashRegistryContract.target).to.be.properAddress;
        });
    });

    describe("Storage and Lookup", function () {
        it("should reject empty strings", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            await expect(decxDAGContract.press("")).to.be.revertedWithCustomError(
                decxDAGContract,
                "DecxDAG_EmptyStringNotAllowed"
            );
        });

        it("should store the same data for the same string in different transactions", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            const STRING = "jumpy dwarf foxes blitz quickly in a night vex.";

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

            const STRING1 = "Hello, world!"; // uses 1 byte for each character
            const STRING2 = "Hell😀, w😀rld!"; // uses 4 bytes for "😀"
            const STRING3 = "hello, wörld!"; // uses 2 bytes for "ö"
            const STRING4 = "Heḹḹợ, woṝḹḑ"; // uses 3 bytes for "ḹ"

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
        it("Should optimize gas usage by avoiding duplicate hashing", async function () {
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

        it("should optimize gas usage by avoiding duplicate hashing for longer strings", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

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
        });

        it("should optimize gas when storing extremely long strings", async function () {
            const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

            const tx1 = await decxDAGContract.press(OLD_MAN1);
            const receipt1 = await tx1.wait();

            receipt1.operation = `novel hashing of 555 characters from "The Old Man and the Sea"`;

            // print the gas fees
            await TestUtils.PrintGasFees([receipt1]);

            // Confirm no additional storage occurred by ensuring the gas cost is minimal
            expect(receipt1.gasUsed).to.be.greaterThan(1000000);
        });

        // THIS TEST IS DISABLED BECAUSE IT TAKES TOO LONG TO RUN AND CAUSES THE CI TO FAIL
        // UNCOMMENT IT TO RUN IT LOCALLY, BUT BE AWARE THAT IT WILL TAKE THE COVERAGE TESTS TOO LONG TO RUN
        // EVENTUALLY CAUSING A STACKOVERFLOW ERROR
        // it("should revert if the string exceeds the gas limit", async function () {
        //     const { decxDAGContract } = await loadFixture(deployDecxDAGFixture);

        //     // Expect the transaction to be reverted with an out of gas error
        //     await expect(decxDAGContract.press(OLD_MAN1 + " " + OLD_MAN2))
        //         .to.be.revertedWithoutReason();

        //     // NOTE: maybe one day this will fail due to a change in the gas limit!
        // });
    });
});
