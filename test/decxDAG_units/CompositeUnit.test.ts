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
const ATOMIC_HASH1 = TestUtils.GenerateAtomicUnit(CHAR1);
const ATOMIC_HASH2 = TestUtils.GenerateAtomicUnit(CHAR2);

describe("CompositeUnit", function () {
  // Define a fixture for consistent setup across tests
  async function deployCompositeUnitFixture() {
    // Get contract factory
    const CompositeUnit = await ethers.getContractFactory("CompositeUnit");

    // Deploy the contract
    const compositeUnitContract = await CompositeUnit.deploy();

    return { compositeUnitContract };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Check that the contract has a valid address
      expect(compositeUnitContract.target).to.be.properAddress;
    });
  });

  describe("Storage and Lookup", function () {
    it("Should store two novel UTF characters as an Composite Unit", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);
      
      // Add the composite unit
      const hash = await compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, ATOMIC_HASH2);

      // Check that the hash exists
      const exists = await compositeUnitContract.isCompositeUnitPresent(hash);
      expect(exists).to.be.true;

      // Check reverse lookup
      const storedHash = await compositeUnitContract.getCompositeUnitHash(ATOMIC_HASH1, ATOMIC_HASH2);
      expect(storedHash).to.equal(hash);
    });

    it("Should return the existing hash for duplicate Composite Units", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add the first composite unit
      await compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, ATOMIC_HASH2);

      // Extract the emitted hash
      const hash1 = await compositeUnitContract.compositeLookup(ATOMIC_HASH1, ATOMIC_HASH2);

      // Add the same composite unit again
      await compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, ATOMIC_HASH2);

      // Extract the returned hash
      const hash2 = await compositeUnitContract.compositeLookup(ATOMIC_HASH1, ATOMIC_HASH2);

      // Verify that the hashes are the same
      expect(hash1).to.equal(hash2);
    });

    it("Should verify that the input is are valid Keccak-256 hashes", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      const invalidHash1 = "0xnot_a_valid_hash";
      const invalidHash2 = "12345";
      const invalidHash3 = "0x6f1c3b3c1c1e1c1e1c1e1c1e1c1e1c1e1c1e1c1e1c1e1c1c1e1c1c1e1c1c1";
      const invalidHash4 = "0xthisisa64charhexstringwiththe0xprefixbutusesthewrongcharacters";
      const invalidHash5 = "this is a plain string with 64 characters!!!!!!!!!!!!!!!!!!!!!!!";

      await expect(compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, invalidHash1)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      await expect(compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, invalidHash2)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      await expect(compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, invalidHash3)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      await expect(compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, invalidHash4)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      await expect(compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, invalidHash5)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add a composite unit
      const tx1 = await compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, ATOMIC_HASH2);
      const receipt1 = await tx1.wait();
      
      // Add the same composite unit again
      const tx2 = await compositeUnitContract.addCompositeUnit(ATOMIC_HASH1, ATOMIC_HASH2);
      const receipt2 = await tx2.wait();

      // uncomment to see the gas used
      console.log(`-- Gas used for 1st insertion of "${CHAR1}""${CHAR2}": ${receipt1.gasUsed.toString()}`);
      console.log(`-- Gas used for 2nd insertion of "${CHAR1}${CHAR2}": ${receipt2.gasUsed.toString()}`);

      // Confirm no additional storage occurred by ensuring the gas cost is minimal
      expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
    });
  });
});
