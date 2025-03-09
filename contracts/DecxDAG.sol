// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./decxDAG_units/DecxRegistry.sol";

contract DecxDAG {
    // Errors
    error DecxDAG_EmptyStringNotAllowed();
    error DecxDAG_HashDoesNotExist();

    // State Variables
    DecxRegistry private decxRegistry;
    uint256 private nextPathIndex;

    // Events
    /**
        @notice Emitted when a new encryption path is created.
        @param hash The hash of the content.
        @param components The components of the encryption path.
        @param index The index of the encryption path.
    */
    event EncryptionPathCreated(bytes32 indexed hash, bytes32[2] components, uint256 index);

    /**
        @notice Emitted when encrypted data is stored for a hash.
        @param hash The hash of the content.
        @param encryptedPayload The encrypted data.
    */
    event EncryptedDataStored(bytes32 indexed hash, bytes encryptedPayload);

    // Constructor
    constructor(address _decxRegistry) {
        decxRegistry = DecxRegistry(_decxRegistry);
        nextPathIndex = 0;
    }

    // Functions
    /**
        @notice Creates a unique hash fingerprint from any text input by processing each character
        @dev Works in two steps:
            1. Converts each UTF-8 character to a hash
            2. Combines these hashes in pairs until only one remains (Merkle DAG style)
        @param input The text string to be converted into a hash
        @return A single 32-byte hash that uniquely represents the entire input string
    */
    function press(string calldata input) external returns (bytes32) {
        bytes memory stringBytes = bytes(input);
        uint256 stringLength = stringBytes.length;

        if (stringLength == 0) {
            revert DecxDAG_EmptyStringNotAllowed();
        }

        // Step 1: Convert the string to an array of hashes
        (bytes32[] memory hashes, uint256 charCount) = convertStringToHashes(stringBytes);

        // Step 2: Iteratively merge hashes using Hashes2Hash until a single hash remains
        bytes32 finalHash = reduceHashes(hashes, charCount);

        return finalHash;
    }

    /**
        @notice Takes a string and creates a hash for each UTF-8 character in it
        @dev Properly handles multi-byte UTF-8 characters (like emojis 😀 or accented letters é)
            by detecting the byte length of each character and processing them accordingly.
        @param stringBytes The raw bytes of the input string
        @return hashes An array where each element is a hash representing one character from the input
        @return charCount The number of UTF-8 characters processed
    */
    function convertStringToHashes(bytes memory stringBytes) private returns (bytes32[] memory hashes, uint256 charCount) {
        uint256 stringLength = stringBytes.length;
        hashes = new bytes32[](stringLength);
        charCount = 0;

        // Process each character
        for (uint256 i = 0; i < stringLength;) {
            // Extract the next character
            uint256 charLen;
            if ((stringBytes[i] & 0x80) == 0x00) charLen = 1;      // 1-byte character
            else if ((stringBytes[i] & 0xe0) == 0xc0) charLen = 2; // 2-byte character
            else if ((stringBytes[i] & 0xf0) == 0xe0) charLen = 3; // 3-byte character
            else charLen = 4;                                      // 4-byte character

            bytes memory charBytes = new bytes(charLen);
            for (uint256 j = 0; j < charLen; j++) {
                charBytes[j] = stringBytes[i + j];
            }

            // Let decxRegistry (which uses UTF8Validator) handle validation
            string memory character = string(charBytes);
            bytes32 hash = decxRegistry.addCharacterHash(character);
            hashes[charCount] = hash;

            // Emit event for character hash with dummy component
            emit EncryptionPathCreated(hash, [hash, bytes32(0)], nextPathIndex++);

            i += charLen;
            charCount++;
        }

        return (hashes, charCount);
    }

    /**
        @notice Reduces an array of hashes into a single hash using Merkle DAG compression
        @dev Implements a bottom-up reduction using pairs of hashes. For odd numbers of hashes,
            the last unpaired hash is promoted to the next level. Continues until only one hash remains.
        @param hashes The array of hashes to be reduced
        @param length The number of valid hashes in the array
        @return The final computed hash
    */
    function reduceHashes(bytes32[] memory hashes, uint256 length) private returns (bytes32) {
        uint256 currentLength = length;

        while (currentLength > 1) {
            uint256 writeIndex = 0;
            for (uint256 i = 0; i + 1 < currentLength; i += 2) {
                bytes32[2] memory components = [hashes[i], hashes[i + 1]];
                bytes32 hash = decxRegistry.addHashesHash(components);
                hashes[writeIndex] = hash;

                emit EncryptionPathCreated(hash, components, nextPathIndex++);
                writeIndex++;
            }
            // If odd length, carry forward last unpaired hash
            if (currentLength % 2 == 1) {
                hashes[writeIndex] = hashes[currentLength - 1];
                writeIndex++;
            }
            currentLength = writeIndex;
        }
        return hashes[0];
    }

    /**
        @notice Get the components of a hash in the decxregistry.
        @param hash The hash to get the components for.
        @return The components of the hash.
    */
    function getComponents(bytes32 hash) external view returns (bytes32[2] memory) {
        return decxRegistry.getComponents(hash);
    }

    /**
        @notice Check if a hash exists in the decxregistry.
        @param hash The hash to check.
        @return True if the hash exists, false otherwise.
    */
    function exists(bytes32 hash) external view returns (bool) {
        return decxRegistry.hashExists(hash);
    }

    /**
        @notice Store encrypted data for a hash.
        @param hash The hash to store the encrypted data for.
        @param encryptedPayload The encrypted data to store.
    */
    function storeEncryptedData(bytes32 hash, bytes calldata encryptedPayload) external {
        // Ensure the hash exists before storing encrypted data
        if (!decxRegistry.hashExists(hash)) {
            revert DecxDAG_HashDoesNotExist();
        }
        emit EncryptedDataStored(hash, encryptedPayload);
    }
}
