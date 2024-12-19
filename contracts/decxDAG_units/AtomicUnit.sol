// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract AtomicUnit {
    // mapping of atomic hashes to true
    mapping(bytes32 => bool) public atomicHashes;

    // mapping of atomic characters to their corresponding hash
    mapping(string => bytes32) public atomicLookup;

    /**
     *   @dev Add an atomic unit to the contract.
     *   @param character The UTF character to add to the contract.
     *   @return The hash of the character.
    */
    function addAtomicUnit(string memory character) public returns (bytes32) {
        // hash the character using keccak256
        bytes32 hash = keccak256(abi.encode((character)));

        // add the hash to the hash mapping
        atomicHashes[hash] = true;

        // add the character to the lookup mapping
        atomicLookup[character] = hash;

        // return the hash as a bytes32
        return hash;
    }
    /**
     *  @dev Check if an atomic unit is present in the contract.
     *   @param hash The hash of the atomic unit to check.
     *   @return True if the atomic unit is present, false otherwise.
    */
    function isAtomicUnitPresent(bytes32 hash) public view returns (bool) {
        return atomicHashes[hash];
    }

    /**
     *  @dev Get the hash of an atomic unit.
     *  @param character The character to get the hash of.
     *  @return The hash of the character.
     */
    function getAtomicUnitHash(string memory character) public view returns (bytes32) {
        return atomicLookup[character];
    }
}