import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// TODO: move to constants string?
const INVALID_HASH_ERROR = "CompositeUnit_InvalidHash";
const INVALID_ARGS_ERROR = "CompositeUnit_InvalidArgs";

// Generate characters and their atomic hashes
const CHAR1 = "a";
const CHAR2 = "b";

describe("CompositeUnit", function () {
  // Define a fixture for consistent setup across tests
  async function deployCompositeUnitFixture() {
    // First deploy HashRegistry
    const HashRegistry = await ethers.getContractFactory("HashRegistry");
    const hashRegistryContract = await HashRegistry.deploy();

    // Then deploy Character2Hash
    const Character2Hash = await ethers.getContractFactory("Character2Hash");
    const character2HashContract = await Character2Hash.deploy(hashRegistryContract.target);

    // Then deploy CompositeUnit with HashRegistry's address
    const CompositeUnit = await ethers.getContractFactory("CompositeUnit");
    const compositeUnitContract = await CompositeUnit.deploy(hashRegistryContract.target);

    return { hashRegistryContract, character2HashContract, compositeUnitContract };
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
      const { hashRegistryContract, character2HashContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add atomic units and get their hashes
      await character2HashContract.addCharacter2Hash(CHAR1);
      await character2HashContract.addCharacter2Hash(CHAR2);

      // Get the actual atomic unit hashes
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
      // ensure the hashes are present in the hash registry
      expect(await hashRegistryContract.isHashPresent(atomicHash1)).to.be.true;
      expect(await hashRegistryContract.isHashPresent(atomicHash2)).to.be.true;

      // Add the composite unit and wait for the transaction
      const atomicHashes = [atomicHash1, atomicHash2];
      const tx = await compositeUnitContract.addCompositeUnit(atomicHashes);
      await tx.wait();

      // Calculate the expected hash the same way the contract does
      const expectedHash = TestUtils.GenerateHashFromHashes(atomicHashes);

      // Check that the hash exists
      const exists = await compositeUnitContract.isCompositeUnitPresent(expectedHash);
      expect(exists).to.be.true;
    });

    it("Should return the existing hash for duplicate Composite Units", async function () {
      const { hashRegistryContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add atomic units and get their hashes
      await hashRegistryContract.addCharacterHash(CHAR1);
      await hashRegistryContract.addCharacterHash(CHAR2);

      // Get the actual atomic unit hashes using getHas
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
      expect(await hashRegistryContract.isHashPresent(atomicHash1)).to.be.true;
      expect(await hashRegistryContract.isHashPresent(atomicHash2)).to.be.true;

      const atomicHashes = [atomicHash1, atomicHash2];

      // Add the first composite unit
      await compositeUnitContract.addCompositeUnit(atomicHashes);

      // Extract the emitted hash
      const hash1 = await compositeUnitContract.getCompositeHash(atomicHash1, atomicHash2);

      // Add the same composite unit again
      await compositeUnitContract.addCompositeUnit(atomicHashes);

      // Extract the returned hash
      const hash2 = await compositeUnitContract.getCompositeHash(atomicHash1, atomicHash2);

      // Verify that the hashes are the same
      expect(hash1).to.equal(hash2);
    });

    it("Should ensure that the input is an array of two hashes", async function () {
      const { hashRegistryContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add atomic units and get their hashes
      await hashRegistryContract.addCharacterHash(CHAR1);
      await hashRegistryContract.addCharacterHash(CHAR2);

      // Get the actual atomic unit hashes using getHas
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);

      const invalidHashes1 = [atomicHash1, atomicHash2, atomicHash1];
      await expect(compositeUnitContract.addCompositeUnit(invalidHashes1)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_ARGS_ERROR
      );
    });

    it("Should not allow invalid hash pairs", async function () {
      const { hashRegistryContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // First add the atomic unit
      await hashRegistryContract.addCharacterHash(CHAR1);
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);

      // Create a fake hash that's the right format but not registered in Character2Hash
      const fakeHash = "0x" + "1".repeat(64);  // Creates a valid bytes32 hex string
      const atomicHashes1 = [atomicHash1, fakeHash];
      const atomicHashes2 = [fakeHash, atomicHash1];
      const atomicHashes3 = [fakeHash, fakeHash];

      await expect(compositeUnitContract.addCompositeUnit(atomicHashes1)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      await expect(compositeUnitContract.addCompositeUnit(atomicHashes2)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );

      await expect(compositeUnitContract.addCompositeUnit(atomicHashes3)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_HASH_ERROR
      );
    });

    it("Should handle empty array input", async function () {
      const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      const emptyArray: string[] = [];
      await expect(compositeUnitContract.addCompositeUnit(emptyArray)).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_ARGS_ERROR
      );
    });

    it("Should reject single hash input", async function () {
      const { hashRegistryContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      await hashRegistryContract.addCharacterHash(CHAR1);
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);

      // Try with just one hash
      await expect(compositeUnitContract.addCompositeUnit([atomicHash1])).to.be.revertedWithCustomError(
        compositeUnitContract,
        INVALID_ARGS_ERROR
      );
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { hashRegistryContract, character2HashContract, compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

      // Add atomic units and get their hashes
      await hashRegistryContract.addCharacterHash(CHAR1);
      await hashRegistryContract.addCharacterHash(CHAR2);

      // Get the actual atomic unit hashes using getHashForCharacter
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
      const atomicHashes = [atomicHash1, atomicHash2];

      // Add a composite unit
      const tx1 = await compositeUnitContract.addCompositeUnit(atomicHashes);
      const receipt1 = await tx1.wait();

      // Add the same composite unit again
      const tx2 = await compositeUnitContract.addCompositeUnit(atomicHashes);
      const receipt2 = await tx2.wait();

      // assign the same operation to both receipts
      receipt1.operation = `novel hashing of "${CHAR1}${CHAR2}"`;
      receipt2.operation = `hashing attempt of "${CHAR1}${CHAR2}"`;

      // print the gas fees
      await TestUtils.PrintGasFees([receipt1, receipt2]);

      // Confirm no additional storage occurred by ensuring the gas cost is minimal
      expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
    });
  });
});

async function getEthPrice() {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    return data.ethereum.usd;
}
