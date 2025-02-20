// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IDecxRegistry {
    /**
        @dev Hash a character and add it to the decxregistry.
        @param character The UTF character to hash.
        @return The hash of the character.
    */
    function addCharacterHash(string memory character) external returns (bytes32);

    /**
        @dev Combine two hashes and add the composite hash to the decxregistry.
        @param hash1 The first hash.
        @param hash2 The second hash.
        @return The composite hash of the two hashes.
    */
    function addHashesHash(bytes32 hash1, bytes32 hash2) external returns (bytes32);

    /**
        @dev Check if a hash is present in the contract.
        @param hash The hash to check.
        @return True if the hash is present, false otherwise.
    */
    function isHashPresent(bytes32 hash) external returns (bool);

    /**
        @dev Get the hash for a character.
        @param character The character to get the hash for.
        @return The hash of the character.
    */
    function getHashForCharacter(string memory character) external returns (bytes32);

    /**
        @dev Get the composite hash for two hashes.
        @param hash1 The first hash.
        @param hash2 The second hash.
        @return The composite hash of the two hashes.
    */
    function getHashForHashes(bytes32 hash1, bytes32 hash2) external view returns (bytes32);
}
