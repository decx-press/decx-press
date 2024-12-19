import { ethers } from "hardhat";
import { expect } from "chai";
import { keccak256, AbiCoder } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

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
    it("Should store a single UTF character as an Atomic Unit", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      const character = "a";
      // NOTE:this may not be the same as the way solidity does it so beware!
      const hash = keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [character]));

      // Add the atomic unit
      await atomicUnitContract.addAtomicUnit(character);

      // Check that the hash exists
      const exists = await atomicUnitContract.isAtomicUnitPresent(hash);
      expect(exists).to.be.true;

      // Check reverse lookup
      const storedHash = await atomicUnitContract.getAtomicUnitHash(character);
      expect(storedHash).to.equal(hash);
    });

    it("Should return the existing hash for duplicate Atomic Units", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      const character = "a";

      // Add the first atomic unit
      await atomicUnitContract.addAtomicUnit(character);

      // Extract the emitted hash
      const hash1 = await atomicUnitContract.atomicLookup(character);

      // Add the same atomic unit again
      await atomicUnitContract.addAtomicUnit(character);

      // Extract the returned hash
      const hash2 = await atomicUnitContract.atomicLookup(character);

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

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      const character = "a";

      // Add the first atomic unit
      const tx1 = await atomicUnitContract.addAtomicUnit(character);
      const receipt1 = await tx1.wait();
      // Add the same atomic unit again
      const tx2 = await atomicUnitContract.addAtomicUnit(character);
      const receipt2 = await tx2.wait();

      // uncomment to see the gas used
      // console.log(`-- Gas used for 1st insertion of "${character}": ${receipt1.gasUsed.toString()}`);
      // console.log(`-- Gas used for 2nd insertion of "${character}": ${receipt2.gasUsed.toString()}`);

      // Confirm no additional storage occurred by ensuring the gas cost is minimal
      expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
    });
  });
});