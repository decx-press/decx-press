import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// Use a single character string for testing
const CHAR = "a";

const isCoverage = process.env.COVERAGE === "true";

describe("Character2Hash", function () {
    // Define a fixture for consistent setup across tests
    async function deployCharacter2HashFixture() {
        // Deploy the HashRegistry contract
        const HashRegistry = await ethers.getContractFactory("HashRegistry");
        const hashRegistryContract = await HashRegistry.deploy();

        // Deploy the UTF8Validator contract
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();

        // Deploy the Character2Hash contract
        const Character2Hash = await ethers.getContractFactory("Character2Hash");
        const character2HashContract = await Character2Hash.deploy(
            hashRegistryContract.target,
            utf8ValidatorContract.target
        );

        return { character2HashContract, hashRegistryContract, utf8ValidatorContract };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { character2HashContract } = await loadFixture(deployCharacter2HashFixture);
            expect(character2HashContract.target).to.be.properAddress;
        });
    });

    describe("Storage and Lookup", function () {
        it("Should store and return consistent hashes", async function () {
            const { character2HashContract } = await loadFixture(deployCharacter2HashFixture);

            // Call the function and wait for the transactions
            const tx1 = await character2HashContract.addCharacter2Hash(CHAR);
            const tx2 = await character2HashContract.addCharacter2Hash(CHAR);

            // Get the actual hash values from the transactions
            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();

            // Compare the returned data (the actual hash values)
            expect(receipt1.data).to.equal(receipt2.data);
        });
    });

    describe("Gas Optimization", function () {
        // Skip gas optimization tests during coverage
        (isCoverage ? it.skip : it)("Should optimize gas usage by avoiding duplicate hashing", async function () {
            const { character2HashContract } = await loadFixture(deployCharacter2HashFixture);

            // Add the first Character2Hash unit
            const tx1 = await character2HashContract.addCharacter2Hash(CHAR);
            const receipt1 = await tx1.wait();
            // Add the same Character2Hash unit again
            const tx2 = await character2HashContract.addCharacter2Hash(CHAR);
            const receipt2 = await tx2.wait();

            receipt1.operation = `novel hashing of "${CHAR}"`;
            receipt2.operation = `hashing attempt of "${CHAR}"`;

            // print the gas fees
            await TestUtils.PrintGasFees([receipt1, receipt2]);

            // Confirm no additional storage occurred by ensuring the gas cost is minimal
            expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
        });
    });
});
