// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IDecxRegistry {

    /**
        @notice Hash a character and add it to the decxregistry.
        @param character The UTF character to hash.
        @return The hash of the character.
    */
    function addCharacterHash(string memory character) external returns (bytes32);

    /**
        @notice Combine two hashes and add the composite hash to the decxregistry.
        @param hashes The array of hashes to combine.
        @return The composite hash of the two hashes.
    */
    function addHashesHash(bytes32[2] memory hashes) external returns (bytes32);

    /**
        @notice Get the hash for a character.
        @param character The character to get the hash for.
        @return The hash of the character.
    */
    function getHashForCharacter(string memory character) external view returns (bytes32);

    /**
        @notice Get the composite hash for two hashes.
        @param hashes The array of hashes to combine.
        @return The composite hash of the two hashes.
    */
    function getHashForHashes(bytes32[2] memory hashes) external view returns (bytes32);

    /**
        @notice Get the components of a hash.
        @param hash The hash to get the components for.
        @return The components of the hash.
    */
    function getComponents(bytes32 hash) external view returns (bytes32[2] memory);

    /**
        @notice Check if a hash exists in the contract.
        @param hash The hash to check.
        @return True if the hash exists, false otherwise.
    */
    function hashExists(bytes32 hash) external view returns (bool);
}
