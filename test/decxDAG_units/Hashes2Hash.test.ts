import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// TODO: move to constants string?
const INVALID_HASH_ERROR = "Hashes2Hash_InvalidHash";
const INVALID_ARGS_ERROR = "Hashes2Hash_InvalidArgs";

// Generate characters and their atomic hashes
const CHAR1 = "a";
const CHAR2 = "b";

describe("Hashes2Hash", function () {
  // Define a fixture for consistent setup across tests
  async function deployHashes2HashFixture() {
    // First deploy HashRegistry
    const HashRegistry = await ethers.getContractFactory("HashRegistry");
    const hashRegistryContract = await HashRegistry.deploy();

    // Then deploy Character2Hash
    const Character2Hash = await ethers.getContractFactory("Character2Hash");
    const character2HashContract = await Character2Hash.deploy(hashRegistryContract.target);

    // Then deploy Hashes2Hash with HashRegistry's address
    const Hashes2Hash = await ethers.getContractFactory("Hashes2Hash");
    const Hashes2HashContract = await Hashes2Hash.deploy(hashRegistryContract.target);

    return { hashRegistryContract, character2HashContract, Hashes2HashContract };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      // Check that the contract has a valid address
      expect(Hashes2HashContract.target).to.be.properAddress;
    });
  });

  describe("Storage and Lookup", function () {
    it("Should store two novel UTF characters as a Composite Unit", async function () {
      const { hashRegistryContract, character2HashContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      // Add Character2Hash units and get their hashes
      await character2HashContract.addCharacter2Hash(CHAR1);
      await character2HashContract.addCharacter2Hash(CHAR2);

      // Get the actual Character2Hash unit hashes
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
      // ensure the hashes are present in the hash registry
      expect(await hashRegistryContract.isHashPresent(atomicHash1)).to.be.true;
      expect(await hashRegistryContract.isHashPresent(atomicHash2)).to.be.true;

      // Add the composite unit and wait for the transaction
      const atomicHashes = [atomicHash1, atomicHash2];
      const tx = await Hashes2HashContract.addHashes2Hash(atomicHashes);
      await tx.wait();

      // Calculate the expected hash the same way the contract does
      const expectedHash = TestUtils.GenerateHashFromHashes(atomicHashes);

      // Check that the hash exists
      const exists = await Hashes2HashContract.isHashes2HashPresent(expectedHash);
      expect(exists).to.be.true;
    });

    it("Should return the existing hash for duplicate Composite Units", async function () {
      const { hashRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      // Add Character2Hash units and get their hashes
      await hashRegistryContract.addCharacterHash(CHAR1);
      await hashRegistryContract.addCharacterHash(CHAR2);

      // Get the actual Character2Hash unit hashes using getHas
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
      expect(await hashRegistryContract.isHashPresent(atomicHash1)).to.be.true;
      expect(await hashRegistryContract.isHashPresent(atomicHash2)).to.be.true;

      const atomicHashes = [atomicHash1, atomicHash2];

      // Add the first composite unit
      await Hashes2HashContract.addHashes2Hash(atomicHashes);

      // Extract the emitted hash
      const hash1 = await Hashes2HashContract.getCompositeHash(atomicHash1, atomicHash2);

      // Add the same composite unit again
      await Hashes2HashContract.addHashes2Hash(atomicHashes);

      // Extract the returned hash
      const hash2 = await Hashes2HashContract.getCompositeHash(atomicHash1, atomicHash2);

      // Verify that the hashes are the same
      expect(hash1).to.equal(hash2);
    });

    it("Should ensure that the input is an array of two hashes", async function () {
      const { hashRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      // Add Character2Hash units and get their hashes
      await hashRegistryContract.addCharacterHash(CHAR1);
      await hashRegistryContract.addCharacterHash(CHAR2);

      // Get the actual Character2Hash unit hashes using getHas
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);

      const invalidHashes1 = [atomicHash1, atomicHash2, atomicHash1];
      await expect(Hashes2HashContract.addHashes2Hash(invalidHashes1)).to.be.revertedWithCustomError(
        Hashes2HashContract,
        INVALID_ARGS_ERROR
      );
    });

    it("Should not allow invalid hash pairs", async function () {
      const { hashRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      // First add the Character2Hash unit
      await hashRegistryContract.addCharacterHash(CHAR1);
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);

      // Create a fake hash that's the right format but not registered in Character2Hash
      const fakeHash = "0x" + "1".repeat(64);  // Creates a valid bytes32 hex string
      const atomicHashes1 = [atomicHash1, fakeHash];
      const atomicHashes2 = [fakeHash, atomicHash1];
      const atomicHashes3 = [fakeHash, fakeHash];

      await expect(Hashes2HashContract.addHashes2Hash(atomicHashes1)).to.be.revertedWithCustomError(
        Hashes2HashContract,
        INVALID_HASH_ERROR
      );

      await expect(Hashes2HashContract.addHashes2Hash(atomicHashes2)).to.be.revertedWithCustomError(
        Hashes2HashContract,
        INVALID_HASH_ERROR
      );

      await expect(Hashes2HashContract.addHashes2Hash(atomicHashes3)).to.be.revertedWithCustomError(
        Hashes2HashContract,
        INVALID_HASH_ERROR
      );
    });

    it("Should handle empty array input", async function () {
      const { Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      const emptyArray: string[] = [];
      await expect(Hashes2HashContract.addHashes2Hash(emptyArray)).to.be.revertedWithCustomError(
        Hashes2HashContract,
        INVALID_ARGS_ERROR
      );
    });

    it("Should reject single hash input", async function () {
      const { hashRegistryContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      await hashRegistryContract.addCharacterHash(CHAR1);
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);

      // Try with just one hash
      await expect(Hashes2HashContract.addHashes2Hash([atomicHash1])).to.be.revertedWithCustomError(
        Hashes2HashContract,
        INVALID_ARGS_ERROR
      );
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { hashRegistryContract, character2HashContract, Hashes2HashContract } = await loadFixture(deployHashes2HashFixture);

      // Add Character2Hash units and get their hashes
      await hashRegistryContract.addCharacterHash(CHAR1);
      await hashRegistryContract.addCharacterHash(CHAR2);

      // Get the actual Character2Hash unit hashes using getHashForCharacter
      const atomicHash1 = await hashRegistryContract.getHashForCharacter(CHAR1);
      const atomicHash2 = await hashRegistryContract.getHashForCharacter(CHAR2);
      const atomicHashes = [atomicHash1, atomicHash2];

      // Add a composite unit
      const tx1 = await Hashes2HashContract.addHashes2Hash(atomicHashes);
      const receipt1 = await tx1.wait();

      // Add the same composite unit again
      const tx2 = await Hashes2HashContract.addHashes2Hash(atomicHashes);
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
