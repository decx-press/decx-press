import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "./TestUtils";
import { Contract } from "ethers";

const isCoverage = process.env.COVERAGE === "true";

describe("Character2Hash", function () {
    let character2Hash: Contract;
    let decxRegistry: Contract;
    let utf8Validator: Contract;

    beforeEach(async function () {
        // Get the contract factories
        const DecxRegistry = await ethers.getContractFactory("DecxRegistry");
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const Character2Hash = await ethers.getContractFactory("Character2Hash");

        // Deploy the contracts
        decxRegistry = await DecxRegistry.deploy();
        await decxRegistry.waitForDeployment();

        utf8Validator = await UTF8Validator.deploy();
        await utf8Validator.waitForDeployment();

        // Get the deployed addresses
        const decxRegistryAddress = await decxRegistry.getAddress();
        const utf8ValidatorAddress = await utf8Validator.getAddress();

        // Deploy main contract with the correct addresses
        character2Hash = await Character2Hash.deploy(decxRegistryAddress, utf8ValidatorAddress);
        await character2Hash.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(character2Hash.target).to.be.properAddress;
        });
    });

    describe("Character validation and hashing", function () {
        it("should successfully add a valid ASCII character and return its hash", async function () {
            const character = "A";
            const tx = await character2Hash.addCharacter2Hash(character);
            const receipt = await tx.wait();

            // Verify the hash is stored in DecxRegistry
            const storedHash = await decxRegistry.getHashForCharacter(character);
            expect(storedHash).to.not.equal(ethers.ZeroHash);
        });

        it("should successfully add a valid UTF-8 character and return its hash", async function () {
            const character = "🚀"; // 4-byte UTF-8 character
            const tx = await character2Hash.addCharacter2Hash(character);
            const receipt = await tx.wait();

            // Verify the hash is stored in DecxRegistry
            const storedHash = await decxRegistry.getHashForCharacter(character);
            expect(storedHash).to.not.equal(ethers.ZeroHash);
        });

        it("should revert for invalid input", async function () {
            const invalidCharacter = "\u0000";
            await expect(character2Hash.addCharacter2Hash(invalidCharacter)).to.be.revertedWithCustomError(
                utf8Validator,
                "UTF8_ControlCharacterNotAllowed"
            );
        });
    });

    describe("Storage and Lookup", function () {
        it("Should store and return consistent hashes", async function () {
            const character = "A";
            const tx1 = await character2Hash.addCharacter2Hash(character);
            const tx2 = await character2Hash.addCharacter2Hash(character);

            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();

            expect(receipt1.data).to.equal(receipt2.data);
        });
    });

    describe("Gas Optimization", function () {
        // Skip gas optimization tests during coverage
        (isCoverage ? it.skip : it)("Should optimize gas usage by avoiding duplicate hashing", async function () {
            const character = "A";

            const tx1 = await character2Hash.addCharacter2Hash(character);
            const receipt1 = await tx1.wait();

            const tx2 = await character2Hash.addCharacter2Hash(character);
            const receipt2 = await tx2.wait();

            receipt1.operation = `novel hashing of "${character}"`;
            receipt2.operation = `hashing attempt of "${character}"`;

            if (process.env.PRINT_FEES === "true") {
                await TestUtils.PrintGasFees([receipt1, receipt2]);
            }

            expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
        });
    });
});
