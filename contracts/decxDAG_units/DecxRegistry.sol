// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../interfaces/IDecxRegistry.sol";

contract DecxRegistry is IDecxRegistry {
    error DecxRegistry_InvalidHash();

    // Hash mappings
    mapping(bytes32 => bool) public HashExists;
    mapping(string => bytes32) public HashLookup;
    mapping(bytes32 => bytes32) public HashesLookup;

    // Encrypted content mappings
    mapping(bytes32 => bytes) public EncryptedContent;
    mapping(bytes32 => bytes32[2]) public EncryptionPaths;
    mapping(bytes32 => address) public ContentCreator;

    // Events
    /// @notice Emitted when content is encrypted.
    /// @param hash The hash of the content.
    /// @param creator The address of the creator.
    event ContentEncrypted(bytes32 indexed hash, address indexed creator);

    /// @notice Emitted when an encryption path is created.
    /// @dev In a character2hash encryption path, the first component is
    ///      the character hash and the second component is the dummy hash (0x0).
    /// @param hash The hash of the content.
    /// @param components The composite components of the encryption path.
    event EncryptionPathCreated(bytes32 indexed hash, bytes32[2] components);

    /// @dev Hash a character and add it to the decxregistry.
    /// @param character The UTF character to hash.
    /// @return The hash of the character.
    function addCharacterHash(string memory character) public returns (bytes32) {
        // Check if the character is already in the contract
        bytes32 existingHash = HashLookup[character];
        if (existingHash != bytes32(0)) {
            return existingHash; // Return existing hash if found
        }

        // Hash the character using keccak256
        bytes32 hash = keccak256(abi.encode(character));

        // Only update if the hash is new
        if (!HashExists[hash]) {
            HashExists[hash] = true;
            HashLookup[character] = hash;

            // Store dummy encrypted content
            EncryptedContent[hash] = dummyEncrypt(character, hash);
            ContentCreator[hash] = msg.sender;

            emit ContentEncrypted(hash, msg.sender);
            emit EncryptionPathCreated(hash, [hash, 0x0]); // Assuming 0x0 is the default
        }

        return hash;
    }

    /// @dev Combine two hashes and add the composite hash to the decxregistry.
    /// @param hash1 The first hash.
    /// @param hash2 The second hash.
    /// @return The composite hash of the two hashes.
    function addHashesHash(bytes32 hash1, bytes32 hash2) public returns (bytes32) {
        // ensure both hashes exist before proceeding
        if (!isHashPresent(hash1) || !isHashPresent(hash2)) {
            revert DecxRegistry_InvalidHash();
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

        // Store dummy encrypted content
        // TODO: Update once we have a real off-chain encryption function
        EncryptedContent[hashesHash] = dummyEncrypt("combined", hashesHash);
        EncryptionPaths[hashesHash] = [hash1, hash2];
        ContentCreator[hashesHash] = msg.sender;

        emit ContentEncrypted(hashesHash, msg.sender);
        emit EncryptionPathCreated(hashesHash, [hash1, hash2]);

        return hashesHash;
    }

    /// @dev Check if a hash is present in the contract.
    /// @param hash The hash to check.
    /// @return True if the hash is present, false otherwise.
    function isHashPresent(bytes32 hash) public view returns (bool) {
        return HashExists[hash];
    }

    /// @dev Get the hash for a character.
    /// @param character The character to get the hash for.
    /// @return The hash of the character.
    function getHashForCharacter(string memory character) public view returns (bytes32) {
        return HashLookup[character];
    }

    /// @dev Get the hash for two hashes.
    /// @param hash1 The first hash.
    /// @param hash2 The second hash.
    /// @return The hash of the two hashes.
    function getHashForHashes(bytes32 hash1, bytes32 hash2) public view returns (bytes32) {
        return HashesLookup[keccak256(abi.encode(hash1, hash2))];
    }

    /// @notice Encrypt content using a key.
    /// @dev This is a dummy function for testing purposes until we have a real off-chain encryption function.
    /// @param content The content to encrypt.
    /// @param key The key to encrypt the content with.
    /// @return The encrypted content.
    function dummyEncrypt(string memory content, bytes32 key) public pure returns (bytes memory) {
        return abi.encode(content, key);
    }
}
