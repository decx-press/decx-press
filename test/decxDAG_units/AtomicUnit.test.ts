import { ethers } from "hardhat";
import { expect } from "chai";
import { keccak256, AbiCoder } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// Use a single character string for testing
const CHAR = "a";

// TODO: move to constants string?
const INVALID_CHARACTER_ERROR = "AtomicUnit_InvalidCharacter";

describe("AtomicUnit", function () {
  // Define a fixture for consistent setup across tests
  async function deployAtomicUnitFixture() {
    // Get contract factory
    const AtomicUnit = await ethers.getContractFactory("AtomicUnit");

    // Deploy the contract
    const atomicUnitContract = await AtomicUnit.deploy();

    return { atomicUnitContract };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      // Check that the contract has a valid address
      expect(atomicUnitContract.target).to.be.properAddress;
    });
  });

  describe("Storage and Lookup", function () {
    it("Should store a single UTF CHARacter as an Atomic Unit", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);
      const hash = TestUtils.GenerateAtomicUnit(CHAR);

      // Add the atomic unit
      await atomicUnitContract.addAtomicUnit(CHAR);

      // Check that the hash exists
      const exists = await atomicUnitContract.isAtomicUnitPresent(hash);
      expect(exists).to.be.true;

      // Check reverse lookup
      const storedHash = await atomicUnitContract.getAtomicUnitHash(CHAR);
      expect(storedHash).to.equal(hash);
    });

    it("Should return the existing hash for duplicate Atomic Units", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      // Add the first atomic unit
      await atomicUnitContract.addAtomicUnit(CHAR);

      // Extract the emitted hash
      const hash1 = await atomicUnitContract.atomicLookup(CHAR);

      // Check that the atomicLookupMapping is not zero for the added character
      expect(await atomicUnitContract.getAtomicUnitHash(character)).to.not.equal(ethers.ZeroHash);
      expect(hash1).to.not.equal(ethers.ZeroHash); // Ensure the returned hash is also not zero

      // Add the same atomic unit again
      await atomicUnitContract.addAtomicUnit(CHAR);

      // Extract the returned hash
      const hash2 = await atomicUnitContract.atomicLookup(CHAR);

      // Verify that the hashes are the same
      expect(hash1).to.equal(hash2);
    });

    it("Should reject empty inputs", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      await expect(atomicUnitContract.addAtomicUnit("")).to.be.revertedWithCustomError(
        atomicUnitContract,
        INVALID_CHARACTER_ERROR
      );
    });

    it("Should reject multiple inputs", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      await expect(atomicUnitContract.addAtomicUnit("ab")).to.be.revertedWithCustomError(
        atomicUnitContract,
        INVALID_CHARACTER_ERROR
      );
    });

    it("Should reject control characters & null inputs", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      await expect(atomicUnitContract.addAtomicUnit("\x00")).to.be.revertedWithCustomError(
        atomicUnitContract,
        INVALID_CHARACTER_ERROR
      );

      await expect(atomicUnitContract.addAtomicUnit("\x0D")).to.be.revertedWithCustomError(
        atomicUnitContract,
        INVALID_CHARACTER_ERROR
      );

      await expect(atomicUnitContract.addAtomicUnit("\x7F")).to.be.revertedWithCustomError(
        atomicUnitContract,
        INVALID_CHARACTER_ERROR
      );
    });
  });

  describe("Character Validation through addAtomicUnit", function () {
    it("Should handle all UTF-8 cases", async function () {
        const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

        // Valid cases
        await expect(atomicUnitContract.addAtomicUnit("a")).to.not.be.reverted;  // ASCII
        await expect(atomicUnitContract.addAtomicUnit("é")).to.not.be.reverted;  // 2-byte
        await expect(atomicUnitContract.addAtomicUnit("€")).to.not.be.reverted;  // 3-byte
        await expect(atomicUnitContract.addAtomicUnit("🚀")).to.not.be.reverted; // 4-byte

        // Invalid cases
        await expect(atomicUnitContract.addAtomicUnit("")).to.be.reverted;       // Empty
        await expect(atomicUnitContract.addAtomicUnit("ab")).to.be.reverted;     // Multiple chars
        await expect(atomicUnitContract.addAtomicUnit("\x00")).to.be.reverted;   // Control char
    });

    it("Should reject invalid UTF-8 first bytes", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      // Invalid 2-byte sequences (first byte wrong)
      const invalid2Byte = String.fromCharCode(0xE0) + String.fromCharCode(0x80);
      await expect(atomicUnitContract.addAtomicUnit(invalid2Byte))
          .to.be.revertedWithCustomError(atomicUnitContract, INVALID_CHARACTER_ERROR);

      // Invalid 3-byte sequences (first byte wrong)
      const invalid3Byte = String.fromCharCode(0xF0) + String.fromCharCode(0x80) + String.fromCharCode(0x80);
      await expect(atomicUnitContract.addAtomicUnit(invalid3Byte))
          .to.be.revertedWithCustomError(atomicUnitContract, INVALID_CHARACTER_ERROR);

      // Invalid 4-byte sequences (first byte wrong)
      const invalid4Byte = String.fromCharCode(0xF8)
        + String.fromCharCode(0x80)
        + String.fromCharCode(0x80)
        + String.fromCharCode(0x80);
      await expect(atomicUnitContract.addAtomicUnit(invalid4Byte))
          .to.be.revertedWithCustomError(atomicUnitContract, INVALID_CHARACTER_ERROR);
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      // Add the first atomic unit
      const tx1 = await atomicUnitContract.addAtomicUnit(CHAR);
      const receipt1 = await tx1.wait();
      // Add the same atomic unit again
      const tx2 = await atomicUnitContract.addAtomicUnit(CHAR);
      const receipt2 = await tx2.wait();

      // uncomment to see the gas used
      console.log(`-- Gas used for 1st insertion of "${CHAR}": ${receipt1.gasUsed.toString()}`);
      console.log(`-- Gas used for 2nd insertion of "${CHAR}": ${receipt2.gasUsed.toString()}`);

      // Confirm no additional storage occurred by ensuring the gas cost is minimal
      expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
    });
  });
});
