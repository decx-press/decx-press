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
    mapping(bytes32 => bytes32) public hashesLookupMap;
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
        // ensure hashes are not zero
        if (hashes[0] == bytes32(0) || hashes[1] == bytes32(0)) {
            revert DecxRegistry_ZeroHashNotAllowed();
        }

        // ensure both hashes exist before proceeding
        if (!hashExistsMap[hashes[0]] || !hashExistsMap[hashes[1]]) {
            revert DecxRegistry_InvalidHash();
        }

        // Encode once and use for both keys
        bytes memory encoded = abi.encode(hashes[0], hashes[1]);

        // Create composite key and check if it exists
        bytes32 compositeKey = keccak256(encoded);
        bytes32 existingHash = hashesLookupMap[compositeKey];
        if (existingHash != bytes32(0)) {
            return existingHash;
        }

        // Use the same encoding for the hash
        bytes32 hashesHash = keccak256(encoded);

        // add the composite hash to the hash & lookup mappings
        hashExistsMap[hashesHash] = true;
        hashesLookupMap[compositeKey] = hashesHash;
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
        return hashesLookupMap[keccak256(abi.encode(hashes))];
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
