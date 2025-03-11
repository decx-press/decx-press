// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../interfaces/IDecxRegistry.sol";
import "../interfaces/IUTF8Validator.sol";

contract DecxRegistry is IDecxRegistry {
    // Errors
    error DecxRegistry_InvalidHash();
    error DecxRegistry_ZeroHashNotAllowed();

    // State Variables
    IUTF8Validator private immutable utf8Validator;
    mapping(bytes32 => bool) public hashExistsMap;
    mapping(string => bytes32) public hashLookupMap;
    mapping(bytes32 => mapping(bytes32 => bytes32)) public hashesLookupMap;
    mapping(bytes32 => bytes32[2]) public encryptionPathsMap;

    constructor(IUTF8Validator _utf8ValidatorAddress) {
        utf8Validator = _utf8ValidatorAddress;
    }

    /**
        @notice Hash a character and add it to the decxregistry.
        @param character The UTF character to hash.
        @return The hash of the character.
    */
    function addCharacterHash(string calldata character) external returns (bytes32) {
        // Validate UTF8 character
        utf8Validator.validateCharacter(character);

        // Check if the character is already in the contract
        bytes32 existingHash = hashLookupMap[character];
        if (existingHash != bytes32(0)) {
            return existingHash; // Return existing hash if found
        }

        // Hash the character using keccak256
        bytes32 hash = keccak256(abi.encode(character));

        // add the hash to the hash & lookup mappings
        hashExistsMap[hash] = true;
        hashLookupMap[character] = hash;

        return hash;
    }

    /**
        @notice Combine two hashes and add the composite hash to the decxregistry.
        @param hashes The array of hashes to combine.
        @return The composite hash of the two hashes.
    */
    function addHashesHash(bytes32[2] calldata hashes) external returns (bytes32) {
        bytes32 hash1 = hashes[0];
        bytes32 hash2 = hashes[1];

        // ensure hashes are not zero
        if (hash1 == bytes32(0) || hash2 == bytes32(0)) {
            revert DecxRegistry_ZeroHashNotAllowed();
        }

        // ensure both hashes exist before proceeding
        if (!hashExistsMap[hash1] || !hashExistsMap[hash2]) {
            revert DecxRegistry_InvalidHash();
        }

        // Check if the composite hash already exists
        bytes32 existingHash = hashesLookupMap[hash1][hash2];
        if (existingHash != bytes32(0)) {
            return existingHash;
        }

        // Encode the hashes and hash them as a single hash
        bytes32 hashesHash = keccak256(abi.encodePacked(hash1, hash2));

        // add the composite hash to the hash & lookup mappings
        hashExistsMap[hashesHash] = true;
        hashesLookupMap[hash1][hash2] = hashesHash;
        encryptionPathsMap[hashesHash] = hashes;

        return hashesHash;
    }

    /**
        @notice Get the hash for a character.
        @param character The character to get the hash for.
        @return The hash of the character.
    */
    function getHashForCharacter(string calldata character) external view returns (bytes32) {
        return hashLookupMap[character];
    }

    /**
        @notice Get the hash for two hashes.
        @param hashes The array of hashes to combine.
        @return The hash of the two hashes.
    */
    function getHashForHashes(bytes32[2] calldata hashes) external view returns (bytes32) {
        return hashesLookupMap[hashes[0]][hashes[1]];
    }

    /**
        @notice Get the components of a hash.
        @param hash The hash to get the components for.
        @return The components of the hash.
    */
    function getComponents(bytes32 hash) external view returns (bytes32[2] memory) {
        return encryptionPathsMap[hash];
    }

    /**
        @notice Check if a hash exists in the contract.
        @param hash The hash to check.
        @return True if the hash exists, false otherwise.
    */
    function hashExists(bytes32 hash) external view returns (bool) {
        return hashExistsMap[hash];
    }
}
