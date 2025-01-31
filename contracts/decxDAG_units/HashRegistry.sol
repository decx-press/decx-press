// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract HashRegistry {
    mapping(bytes32 => bool) public hashExists;
    mapping(string => bytes32) public character2HashLookup;

    /**
        @dev Hash a character and add it to the hash registry.
        @param character The UTF character to hash.
        @return The hash of the character.
    */
    function addCharacterHash(string memory character) public returns (bytes32) {
        // first check if the character is already in the contract
        if (character2HashLookup[character] != bytes32(0)) {
            return character2HashLookup[character];
        }

        // hash the character using keccak256
        bytes32 hash = keccak256(abi.encode((character)));

        // add the hash to the hash & lookup mappings
        hashExists[hash] = true;
        character2HashLookup[character] = hash;

        // return the computed hash
        return hash;
    }

    /**
        @dev Check if a hash is present in the contract.
        @param hash The hash to check.
        @return True if the hash is present, false otherwise.
    */
    function isHashPresent(bytes32 hash) public view returns (bool) {
        return hashExists[hash];
    }

    /**
        @dev Get the hash for a character.
        @param character The character to get the hash for.
        @return The hash of the character.
    */
    function getHashForCharacter(string memory character) public view returns (bytes32) {
        return character2HashLookup[character];
    }
}