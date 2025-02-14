// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract HashRegistry {
    error HashRegistry_InvalidHash();

    mapping(bytes32 => bool) public HashExists;
    mapping(string => bytes32) public HashLookup;
    mapping(bytes32 => bytes32) public HashesLookup;

    /**
        @dev Hash a character and add it to the hash registry.
        @param character The UTF character to hash.
        @return The hash of the character.
    */
    function addCharacterHash(string memory character) public returns (bytes32) {
        // first check if the character is already in the contract
        if (HashLookup[character] != bytes32(0)) {
            return HashLookup[character];
        }

        // hash the character using keccak256
        bytes32 hash = keccak256(abi.encode((character)));

        // add the hash to the hash & lookup mappings
        HashExists[hash] = true;
        HashLookup[character] = hash;

        // return the computed hash
        return hash;
    }

    /**
        @dev Combine two hashes and add the composite hash to the hash registry.
        @param hash1 The first hash.
        @param hash2 The second hash.
        @return The composite hash of the two hashes.
    */
    function addHashesHash(bytes32 hash1, bytes32 hash2) public returns (bytes32) {
        // ensure both hashes exist before proceeding
        if (!isHashPresent(hash1) || !isHashPresent(hash2)) {
            revert HashRegistry_InvalidHash();
        }

        // Encode once and use for both keys
        bytes memory encoded = abi.encode(hash1, hash2);

        // Create composite key and check if it exists
        bytes32 compositeKey = keccak256(encoded);
        bytes32 existingHash = HashesLookup[compositeKey];
        if (existingHash != bytes32(0)) {
            return existingHash;
        }

        // Use the same encoding for the hash
        bytes32 hashesHash = keccak256(encoded);

        // add the composite hash to the hash & lookup mappings
        HashExists[hashesHash] = true;
        HashesLookup[compositeKey] = hashesHash;

        return hashesHash;
    }

    /**
        @dev Check if a hash is present in the contract.
        @param hash The hash to check.
        @return True if the hash is present, false otherwise.
    */
    function isHashPresent(bytes32 hash) public view returns (bool) {
        return HashExists[hash];
    }

    /**
        @dev Get the hash for a character.
        @param character The character to get the hash for.
        @return The hash of the character.
    */
    function getHashForCharacter(string memory character) public view returns (bytes32) {
        return HashLookup[character];
    }

    /**
        @dev Get the hash for two hashes.
        @param hash1 The first hash.
        @param hash2 The second hash.
        @return The hash of the two hashes.
    */
    function getHashForHashes(bytes32 hash1, bytes32 hash2) public view returns (bytes32) {
        return HashesLookup[keccak256(abi.encode(hash1, hash2))];
    }
}
