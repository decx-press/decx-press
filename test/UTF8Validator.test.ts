import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("UTF8Validator", function () {
    async function deployUTF8ValidatorFixture() {
        const UTF8Validator = await ethers.getContractFactory("UTF8Validator");
        const utf8ValidatorContract = await UTF8Validator.deploy();
        return { utf8ValidatorContract };
    }

    describe("Validation", function () {
        it("Should reject empty inputs", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);
            await expect(utf8ValidatorContract.validateCharacter("")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_InvalidCharacter"
            );
        });

        it("Should reject control characters", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);

            await expect(utf8ValidatorContract.validateCharacter("\x00")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_ControlCharacterNotAllowed"
            );

            await expect(utf8ValidatorContract.validateCharacter("\x1F")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_ControlCharacterNotAllowed"
            );

            await expect(utf8ValidatorContract.validateCharacter("\x7F")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_ControlCharacterNotAllowed"
            );
        });

        it("Should handle valid UTF-8 characters", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);

            // Test valid characters
            await expect(utf8ValidatorContract.validateCharacter("a")).to.not.be.reverted; // ASCII
            await expect(utf8ValidatorContract.validateCharacter("é")).to.not.be.reverted; // 2-byte
            await expect(utf8ValidatorContract.validateCharacter("€")).to.not.be.reverted; // 3-byte
            await expect(utf8ValidatorContract.validateCharacter("🚀")).to.not.be.reverted; // 4-byte
        });

        // TODO: Remove this test? We do it in the prior test
        it("Should verify 2-byte character length", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);
            const twoByteChar = "é";
            await expect(utf8ValidatorContract.validateCharacter(twoByteChar)).to.not.be.reverted;
        });
    });

    describe("Invalid sequences", function () {
        it("Should reject empty strings", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);
            await expect(utf8ValidatorContract.validateCharacter("")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_InvalidCharacter"
            );
        });

        it("Should reject multiple characters", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);
            await expect(utf8ValidatorContract.validateCharacter("ab")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_InvalidCharacter"
            );
        });

        it("Should reject control characters", async function () {
            const { utf8ValidatorContract } = await loadFixture(deployUTF8ValidatorFixture);
            await expect(utf8ValidatorContract.validateCharacter("\x00")).to.be.revertedWithCustomError(
                utf8ValidatorContract,
                "UTF8_ControlCharacterNotAllowed"
            );
        });
    });
});
