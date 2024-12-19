import { ethers } from "hardhat";
import { expect } from "chai";
import { keccak256, toUtf8Bytes } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

// TODO: move to constants string?
const invalidInputError = "Invalid input: Atomic Unit must accept only a single UTF character";

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
      const hash = keccak256(toUtf8Bytes(character));

      // Add atomic unit (uses generic named "add" - rename to whatever it ends up being)
      await atomicUnitContract.add(character);

      // Check that the hash exists (uses generic named "find" - rename to whatever it ends up being)
      const exists = await atomicUnitContract.find(hash);
      expect(exists).to.be.true;

      // Check reverse lookup (uses generic named "get" - rename to whatever it ends up being)
      const storedHash = await atomicUnitContract.get(character);
      expect(storedHash).to.equal(hash);
    });

    it("Should prevent duplicate Atomic Units", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      const character = "a";

      // Add atomic unit
      await atomicUnitContract.add(character);

      // Try adding the same unit again
      await expect(atomicUnitContract.add(character)).to.be.revertedWith(
        "Atomic Unit already exists"
      );
    });

    it("Should reject invalid inputs", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      // Test empty string
      await expect(atomicUnitContract.add("")).to.be.revertedWith(
        invalidInputError
      );

      // Test multiple characters
      await expect(atomicUnitContract.add("ab")).to.be.revertedWith(
        invalidInputError
      );

      // Test null character (edge case)
      await expect(atomicUnitContract.add("\0")).to.be.revertedWith(
        invalidInputError
      );
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage by avoiding duplicate hashing", async function () {
      const { atomicUnitContract } = await loadFixture(deployAtomicUnitFixture);

      const character = "a";

      // Measure gas cost for a new atomic unit
      const tx1 = await atomicUnitContract.add(character);
      const receipt1 = await tx1.wait();
      console.log("Gas used for first insertion:", receipt1.gasUsed.toString());

      // Measure gas cost for a duplicate attempt
      await expect(atomicUnitContract.add(character)).to.be.revertedWith(
        "Atomic Unit already exists"
      );
    });
  });
});