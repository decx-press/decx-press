// import { ethers } from "hardhat";
// import { expect } from "chai";
// import { keccak256, AbiCoder } from "ethers";
// import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
// import "@nomicfoundation/hardhat-chai-matchers";

// // TODO: move to constants string?
// const INVALID_CHARACTER_ERROR = "CompositeUnit_InvalidCharacter";

// describe("CompositeUnit", function () {
//   // Define a fixture for consistent setup across tests
//   async function deployCompositeUnitFixture() {
//     // Get contract factory
//     const CompositeUnit = await ethers.getContractFactory("CompositeUnit");

//     // Deploy the contract
//     const compositeUnitContract = await CompositeUnit.deploy();

//     return { compositeUnitContract };
//   }

//   describe("Deployment", function () {
//     it("Should deploy successfully", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       // Check that the contract has a valid address
//       expect(compositeUnitContract.target).to.be.properAddress;
//     });
//   });

//   describe("Storage and Lookup", function () {
//     it("Should store a single UTF character as an Composite Unit", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       const char1 = "a";
//       const char2 = "b";

//       // NOTE:this may not be the same as the way solidity does it so beware!
//       const hash1 = keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [char1]));
//       const hash2 = keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [char2]));
      
//       // Add the composite unit
//       await compositeUnitContract.addCompositeUnit(character);

//       // Check that the hash exists
//       const exists = await compositeUnitContract.isCompositeUnitPresent(hash);
//       expect(exists).to.be.true;

//       // Check reverse lookup
//       const storedHash = await compositeUnitContract.getCompositeUnitHash(character);
//       expect(storedHash).to.equal(hash);
//     });

//     it("Should return the existing hash for duplicate Composite Units", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       const character = "a";

//       // Add the first composite unit
//       await compositeUnitContract.addCompositeUnit(character);

//       // Extract the emitted hash
//       const hash1 = await compositeUnitContract.compositeLookup(character);

//       // Add the same composite unit again
//       await compositeUnitContract.addCompositeUnit(character);

//       // Extract the returned hash
//       const hash2 = await compositeUnitContract.compositeLookup(character);

//       // Verify that the hashes are the same
//       expect(hash1).to.equal(hash2);
//     });

//     it("Should reject empty inputs", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       await expect(compositeUnitContract.addCompositeUnit("")).to.be.revertedWithCustomError(
//         compositeUnitContract,
//         INVALID_CHARACTER_ERROR
//       );
//     });

//     it("Should reject multiple inputs", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       await expect(compositeUnitContract.addCompositeUnit("ab")).to.be.revertedWithCustomError(
//         compositeUnitContract,
//         INVALID_CHARACTER_ERROR
//       );
//     });

//     it("Should reject control characters & null inputs", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       await expect(compositeUnitContract.addCompositeUnit("\x00")).to.be.revertedWithCustomError(
//         compositeUnitContract,
//         INVALID_CHARACTER_ERROR
//       );

//       await expect(compositeUnitContract.addCompositeUnit("\x0D")).to.be.revertedWithCustomError(
//         compositeUnitContract,
//         INVALID_CHARACTER_ERROR
//       );

//       await expect(compositeUnitContract.addCompositeUnit("\x7F")).to.be.revertedWithCustomError(
//         compositeUnitContract,
//         INVALID_CHARACTER_ERROR
//       );
//     });
//   });

//   describe("Gas Optimization", function () {
//     it("Should optimize gas usage by avoiding duplicate hashing", async function () {
//       const { compositeUnitContract } = await loadFixture(deployCompositeUnitFixture);

//       const character = "a";

//       // Add the first composite unit
//       const tx1 = await compositeUnitContract.addCompositeUnit(character);
//       const receipt1 = await tx1.wait();
//       // Add the same composite unit again
//       const tx2 = await compositeUnitContract.addCompositeUnit(character);
//       const receipt2 = await tx2.wait();

//       // uncomment to see the gas used
//       // console.log(`-- Gas used for 1st insertion of "${character}": ${receipt1.gasUsed.toString()}`);
//       // console.log(`-- Gas used for 2nd insertion of "${character}": ${receipt2.gasUsed.toString()}`);

//       // Confirm no additional storage occurred by ensuring the gas cost is minimal
//       expect(receipt2.gasUsed).to.be.lessThan(receipt1.gasUsed);
//     });
//   });
// });