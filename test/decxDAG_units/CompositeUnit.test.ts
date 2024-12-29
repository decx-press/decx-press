import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";
// TODO: move to constants string?
const INVALID_HASH_ERROR = "CompositeUnit_InvalidHash";

// Generate characters and their atomic hashes
const CHAR1 = "a";
const CHAR2 = "b";

describe("CompositeUnit", function () {
  // Define a fixture for consistent setup across tests
  async function deployCompositeUnitFixture() {

    // First deploy AtomicUnit
    const AtomicUnit = await ethers.getContractFactory("AtomicUnit");
    const atomicUnitContract = await AtomicUnit.deploy();

    // Then deploy CompositeUnit with AtomicUnit's address
    const CompositeUnit = await ethers.getContractFactory("CompositeUnit");
    const compositeUnitContract = await CompositeUnit.deploy(atomicUnitContract.target);

    return { atomicUnitContract, compositeUnitContract };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Check that the contract has a valid address
      expect(compositeUnitContract.target).to.be.properAddress;
    });
  });

  describe("Storage and Lookup", function () {
    it("Should store two novel UTF characters as a Composite Unit", async function () {
      const { atomicUnitContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add atomic units and get their hashes
      await atomicUnitContract.addAtomicUnit(CHAR1);
      await atomicUnitContract.addAtomicUnit(CHAR2);

      // Get the actual atomic unit hashes
      const atomicHash1 = await atomicUnitContract.getAtomicUnitHash(CHAR1);
      const atomicHash2 = await atomicUnitContract.getAtomicUnitHash(CHAR2);
      const atomicHashes = [atomicHash1, atomicHash2];

      // Add the composite unit and wait for the transaction
      const tx = await compositeUnitContract.addCompositeUnit(atomicHashes);
      await tx.wait();  // Wait for transaction to be mined

      // Calculate the expected hash the same way the contract does
      const expectedHash = TestUtils.GenerateHashFromHashes(atomicHashes);

      // Check that the hash exists
      const exists = await compositeUnitContract.isCompositeUnitPresent(expectedHash);
      expect(exists).to.be.true;
    });

    it("Should return the existing hash for duplicate Composite Units", async function () {
      const { atomicUnitContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);
      
      // Add atomic units and get their hashes
      await atomicUnitContract.addAtomicUnit(CHAR1);
      await atomicUnitContract.addAtomicUnit(CHAR2);
      
      // Get the actual atomic unit hashes using getAtomicUnitHash
      const atomicHash1 = await atomicUnitContract.getAtomicUnitHash(CHAR1);
      const atomicHash2 = await atomicUnitContract.getAtomicUnitHash(CHAR2);
      const atomicHashes = [atomicHash1, atomicHash2];

      // Add the first composite unit
      await compositeUnitContract.addCompositeUnit(atomicHashes);

      // Extract the emitted hash
      const hash1 = await compositeUnitContract.compositeLookup(atomicHash1, atomicHash2);

      // Add the same composite unit again
      await compositeUnitContract.addCompositeUnit(atomicHash1, atomicHash2);

      // Extract the returned hash
      const hash2 = await compositeUnitContract.compositeLookup(atomicHash1, atomicHash2);

      // Verify that the hashes are the same
      expect(hash1).to.equal(hash2);
    });

    it("Should verify that the input is are valid Keccak-256 hashes", async function () {
      const { atomicUnitContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);
      const atomicHash1 = await atomicUnitContract.addAtomicUnit(CHAR1);

      const invalidHashes1 = [atomicHash1, "0xnot_a_valid_hash"];
      await expect(compositeUnitContract.addCompositeUnit(invalidHashes1)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      const invalidHashes2 = [atomicHash1, "12345"];
      await expect(compositeUnitContract.addCompositeUnit(invalidHashes2)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      const invalidHashes3 = [atomicHash1, "0x6f1c3b3c1c1e1c1e1c1e1c1e1c1e1c1e1c1e1c1e1c1e1c1c1e1c1c1e1c1c1"];
      await expect(compositeUnitContract.addCompositeUnit(invalidHashes3)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      const invalidHashes4 = [atomicHash1, "0xthisisa64charhexstringwiththe0xprefixbutusesthewrongcharacters"];
      await expect(compositeUnitContract.addCompositeUnit(invalidHashes4)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      const invalidHashes5 = [atomicHash1, "this is a plain string with 64 characters!!!!!!!!!!!!!!!!!!!!!!!"];
      await expect(compositeUnitContract.addCompositeUnit(invalidHashes5)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { atomicUnitContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);
      
      // Add atomic units and get their hashes
      await atomicUnitContract.addAtomicUnit(CHAR1);
      await atomicUnitContract.addAtomicUnit(CHAR2);
      
      // Get the actual atomic unit hashes using getAtomicUnitHash
      const atomicHash1 = await atomicUnitContract.getAtomicUnitHash(CHAR1);
      const atomicHash2 = await atomicUnitContract.getAtomicUnitHash(CHAR2);
      const atomicHashes = [atomicHash1, atomicHash2];

      // Add a composite unit
      const tx1 = await compositeUnitContract.addCompositeUnit(atomicHashes);
      const receipt1 = await tx1.wait();
      
      // Add the same composite unit again
      const tx2 = await compositeUnitContract.addCompositeUnit(atomicHashes);
      const receipt2 = await tx2.wait();

      // uncomment to see the gas used
      console.log(`-- Gas used for 1st insertion of "${CHAR1}${CHAR2}": ${receipt1.gasUsed.toString()}`);
      console.log(`-- Gas used for 2nd insertion of "${CHAR1}${CHAR2}": ${receipt2.gasUsed.toString()}`);

      // Confirm no additional storage occurred by ensuring the gas cost is minimal
      expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
    });
  });
});
