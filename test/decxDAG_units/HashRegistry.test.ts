import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { TestUtils } from "../TestUtils";

// Use a single character string for testing
const CHAR = "a";

describe("HashRegistry", function () {
  // Define a fixture for consistent setup across tests
  async function deployHashRegistryFixture() {
    // First deploy the HashRegistry contract
    const HashRegistry = await ethers.getContractFactory("HashRegistry");
    const hashRegistryContract = await HashRegistry.deploy();

    return { hashRegistryContract };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { hashRegistryContract } = await loadFixture(deployHashRegistryFixture);

      // Check that the contract has a valid address
      expect(hashRegistryContract.target).to.be.properAddress;
    });
  });

  describe("Storage and Lookup", function () {
    it("Should store a single UTF Character", async function () {
        const { hashRegistryContract } = await loadFixture(deployHashRegistryFixture);
        const hash = TestUtils.GenerateHashFromChar(CHAR);

        // Add the Character2Hash unit
        await hashRegistryContract.addCharacterHash(CHAR);

        // Check that the hash exists
        const exists = await hashRegistryContract.isHashPresent(hash);
        expect(exists).to.be.true;

        // Check reverse lookup
        const storedHash = await hashRegistryContract.getHashForCharacter(CHAR);
        expect(storedHash).to.equal(hash);
      });

      it("Should return the existing hash for duplicate Character2Hash Units", async function () {
        const { hashRegistryContract } = await loadFixture(deployHashRegistryFixture);

        // Add the first Character2Hash unit
        await hashRegistryContract.addCharacterHash(CHAR);

        // Extract the emitted hash
        const hash1 = await hashRegistryContract.getHashForCharacter(CHAR);

        // Check that the atomicLookupMapping is not zero for the added character
        expect(await hashRegistryContract.getHashForCharacter(CHAR)).to.not.equal(ethers.ZeroHash);
        expect(hash1).to.not.equal(ethers.ZeroHash); // Ensure the returned hash is also not zero

        // Add the same Character2Hash unit again
        await hashRegistryContract.addCharacterHash(CHAR);

        // Extract the returned hash
        const hash2 = await hashRegistryContract.getHashForCharacter(CHAR);

        // Verify that the hashes are the same
        expect(hash1).to.equal(hash2);
      });
  });
});
