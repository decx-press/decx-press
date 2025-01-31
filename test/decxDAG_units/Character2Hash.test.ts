import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// Use a single character string for testing
const CHAR = "a";

// TODO: move to constants string?
const INVALID_CHARACTER_ERROR = "Character2Hash_InvalidCharacter";

describe("Character2Hash", function () {
  // Define a fixture for consistent setup across tests
  async function deployCharacter2HashFixture() {
    // Get contract factory
    const Character2Hash = await ethers.getContractFactory("Character2Hash");

    // Deploy the contract
    const Character2HashContract = await Character2Hash.deploy();

    return { Character2HashContract };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      // Check that the contract has a valid address
      expect(Character2HashContract.target).to.be.properAddress;
    });
  });

  describe("Storage and Lookup", function () {
    it("Should store a single UTF CHARacter as an Atomic Unit", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);
      const hash = TestUtils.GenerateHashFromChar(CHAR);

      // Add the atomic unit
      await Character2HashContract.addCharacter2Hash(CHAR);

      // Check that the hash exists
      const exists = await Character2HashContract.isCharacter2HashPresent(hash);
      expect(exists).to.be.true;

      // Check reverse lookup
      const storedHash = await Character2HashContract.getHashForCharacter(CHAR);
      expect(storedHash).to.equal(hash);
    });

    it("Should return the existing hash for duplicate Atomic Units", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      // Add the first atomic unit
      await Character2HashContract.addCharacter2Hash(CHAR);

      // Extract the emitted hash
      const hash1 = await Character2HashContract.atomicLookup(CHAR);

      // Check that the atomicLookupMapping is not zero for the added character
      expect(await Character2HashContract.getHashForCharacter(CHAR)).to.not.equal(ethers.ZeroHash);
      expect(hash1).to.not.equal(ethers.ZeroHash); // Ensure the returned hash is also not zero

      // Add the same atomic unit again
      await Character2HashContract.addCharacter2Hash(CHAR);

      // Extract the returned hash
      const hash2 = await Character2HashContract.atomicLookup(CHAR);

      // Verify that the hashes are the same
      expect(hash1).to.equal(hash2);
    });

    it("Should reject empty inputs", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      await expect(Character2HashContract.addCharacter2Hash("")).to.be.revertedWithCustomError(
        Character2HashContract,
        INVALID_CHARACTER_ERROR
      );
    });

    it("Should reject multiple inputs", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      await expect(Character2HashContract.addCharacter2Hash("ab")).to.be.revertedWithCustomError(
        Character2HashContract,
        INVALID_CHARACTER_ERROR
      );
    });

    it("Should reject control characters & null inputs", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      await expect(Character2HashContract.addCharacter2Hash("\x00")).to.be.revertedWithCustomError(
        Character2HashContract,
        INVALID_CHARACTER_ERROR
      );

      await expect(Character2HashContract.addCharacter2Hash("\x0D")).to.be.revertedWithCustomError(
        Character2HashContract,
        INVALID_CHARACTER_ERROR
      );

      await expect(Character2HashContract.addCharacter2Hash("\x7F")).to.be.revertedWithCustomError(
        Character2HashContract,
        INVALID_CHARACTER_ERROR
      );
    });
  });

  describe("Character Validation through addCharacter2Hash", function () {
    it("Should handle all UTF-8 cases", async function () {
        const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

        // Valid cases
        await expect(Character2HashContract.addCharacter2Hash("a")).to.not.be.reverted;  // ASCII
        await expect(Character2HashContract.addCharacter2Hash("é")).to.not.be.reverted;  // 2-byte
        await expect(Character2HashContract.addCharacter2Hash("€")).to.not.be.reverted;  // 3-byte
        await expect(Character2HashContract.addCharacter2Hash("🚀")).to.not.be.reverted; // 4-byte

        // Invalid cases
        await expect(Character2HashContract.addCharacter2Hash("")).to.be.reverted;       // Empty
        await expect(Character2HashContract.addCharacter2Hash("ab")).to.be.reverted;     // Multiple chars
        await expect(Character2HashContract.addCharacter2Hash("\x00")).to.be.reverted;   // Control char
    });

    it("Should reject invalid UTF-8 first bytes", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      // Invalid 2-byte sequences (first byte wrong)
      const invalid2Byte = String.fromCharCode(0xE0) + String.fromCharCode(0x80);
      await expect(Character2HashContract.addCharacter2Hash(invalid2Byte))
          .to.be.revertedWithCustomError(Character2HashContract, INVALID_CHARACTER_ERROR);

      // Invalid 3-byte sequences (first byte wrong)
      const invalid3Byte = String.fromCharCode(0xF0) + String.fromCharCode(0x80) + String.fromCharCode(0x80);
      await expect(Character2HashContract.addCharacter2Hash(invalid3Byte))
          .to.be.revertedWithCustomError(Character2HashContract, INVALID_CHARACTER_ERROR);

      // Invalid 4-byte sequences (first byte wrong)
      const invalid4Byte = String.fromCharCode(0xF8)
        + String.fromCharCode(0x80)
        + String.fromCharCode(0x80)
        + String.fromCharCode(0x80);
      await expect(Character2HashContract.addCharacter2Hash(invalid4Byte))
          .to.be.revertedWithCustomError(Character2HashContract, INVALID_CHARACTER_ERROR);
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { Character2HashContract } = await loadFixture(deployCharacter2HashFixture);

      // Add the first atomic unit
      const tx1 = await Character2HashContract.addCharacter2Hash(CHAR);
      const receipt1 = await tx1.wait();
      // Add the same atomic unit again
      const tx2 = await Character2HashContract.addCharacter2Hash(CHAR);
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
