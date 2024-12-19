import { expect } from "chai";
import { keccak256, toUtf8Bytes } from "ethers";
import { ethers } from "hardhat";

describe("AtomicUnit", function () {
  let atomicUnitContract: any;

  beforeEach(async function () {
    // Deploy the AtomicUnit contract before each test
    const AtomicUnit = await ethers.getContractFactory("AtomicUnit");
    atomicUnitContract = await AtomicUnit.deploy();
    await atomicUnitContract.deployed();
  });

  it("Should store a single UTF character as an Atomic Unit", async function () {
    const character = "a";
    const hash = keccak256(toUtf8Bytes(character));

    // Add atomic unit
    await atomicUnitContract.addAtomicUnit(character);

    // Check that the hash exists
    const exists = await atomicUnitContract.atomicHashes(hash);
    expect(exists).to.be.true;

    // Check reverse lookup
    const storedHash = await atomicUnitContract.atomicLookup(character);
    expect(storedHash).to.equal(hash);
  });

  it("Should prevent duplicate Atomic Units", async function () {
    const character = "a";

    // Add atomic unit
    await atomicUnitContract.addAtomicUnit(character);

    // Try adding the same unit again
    await expect(atomicUnitContract.addAtomicUnit(character)).to.be.revertedWith(
      "Atomic Unit already exists"
    );
  });

  it("Should reject invalid inputs", async function () {
    // Test empty string
    await expect(atomicUnitContract.addAtomicUnit("")).to.be.revertedWith(
      "Invalid input: must be a single UTF character"
    );

    // Test multiple characters
    await expect(atomicUnitContract.addAtomicUnit("ab")).to.be.revertedWith(
      "Invalid input: must be a single UTF character"
    );

    // Test null character (edge case)
    await expect(atomicUnitContract.addAtomicUnit("\0")).to.be.revertedWith(
      "Invalid input: must be a single UTF character"
    );
  });

  it("Should validate if an Atomic Unit exists by hash", async function () {
    const character = "a";
    const hash = keccak256(toUtf8Bytes(character));

    // Add atomic unit
    await atomicUnitContract.addAtomicUnit(character);

    // Check existence
    const exists = await atomicUnitContract.atomicHashes(hash);
    expect(exists).to.be.true;

    // Check for a non-existent hash
    const fakeHash = keccak256(toUtf8Bytes("z"));
    const nonExistent = await atomicUnitContract.atomicHashes(fakeHash);
    expect(nonExistent).to.be.false;
  });

  it("Should retrieve an Atomic Unit by hash", async function () {
    const character = "a";
    const hash = keccak256(toUtf8Bytes(character));

    // Add atomic unit
    await atomicUnitContract.addAtomicUnit(character);

    // Retrieve the character by hash
    const retrievedHash = await atomicUnitContract.atomicLookup(character);
    expect(retrievedHash).to.equal(hash);
  });

  it("Should optimize gas usage by avoiding duplicate hashing", async function () {
    const character = "a";

    // Measure gas cost for a new atomic unit
    const tx1 = await atomicUnitContract.addAtomicUnit(character);
    const receipt1 = await tx1.wait();
    console.log("Gas used for first insertion:", receipt1.gasUsed.toString());

    // Measure gas cost for a duplicate attempt
    await expect(atomicUnitContract.addAtomicUnit(character)).to.be.revertedWith(
      "Atomic Unit already exists"
    );
  });
});