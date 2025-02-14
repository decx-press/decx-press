const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Character2Hash", function () {
    let character2Hash;
    let hashRegistry;
    let utf8Validator;

    beforeEach(async function () {
        // Get the contract factories
        const HashRegistry = await ethers.getContractFactory("HashRegistry");
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const Character2Hash = await ethers.getContractFactory("Character2Hash");

        // Deploy the contracts
        hashRegistry = await HashRegistry.deploy();
        await hashRegistry.waitForDeployment();

        utf8Validator = await UTF8Validator.deploy();
        await utf8Validator.waitForDeployment();

        // Get the deployed addresses
        const hashRegistryAddress = await hashRegistry.getAddress();
        const utf8ValidatorAddress = await utf8Validator.getAddress();

        // Deploy main contract with the correct addresses
        character2Hash = await Character2Hash.deploy(hashRegistryAddress, utf8ValidatorAddress);
        await character2Hash.waitForDeployment();
    });

    describe("Character validation and hashing", function () {
        it("should successfully add a valid ASCII character and return its hash", async function () {
            const character = "A";
            const tx = await character2Hash.addCharacter2Hash(character);
            const receipt = await tx.wait();

            // Verify the hash is stored in HashRegistry
            const storedHash = await hashRegistry.getHashForCharacter(character);
            expect(storedHash).to.not.equal(ethers.ZeroHash);
        });

        it("should successfully add a valid UTF-8 character and return its hash", async function () {
            const character = "🚀"; // 4-byte UTF-8 character
            const tx = await character2Hash.addCharacter2Hash(character);
            const receipt = await tx.wait();

            // Verify the hash is stored in HashRegistry
            const storedHash = await hashRegistry.getHashForCharacter(character);
            expect(storedHash).to.not.equal(ethers.ZeroHash);
        });

        // One error case is sufficient since UTF8Validator tests cover all validation cases
        it("should revert for invalid input", async function () {
            const invalidCharacter = "\u0000";
            await expect(character2Hash.addCharacter2Hash(invalidCharacter)).to.be.revertedWithCustomError(
                utf8Validator,
                "UTF8_ControlCharacterNotAllowed"
            );
        });
    });
});
