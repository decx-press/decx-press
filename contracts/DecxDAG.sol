// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./decxDAG_units/Character2Hash.sol";
import "./decxDAG_units/Hashes2Hash.sol";

contract DecxDAG {
    error DecxDAG_EmptyInput();

    Character2Hash private character2Hash;
    Hashes2Hash private hashes2Hash;
    // state variables
    uint256 private stringLength;
    uint256 private charCount;

    constructor(address _character2Hash, address _hashes2Hash) {
        character2Hash = Character2Hash(_character2Hash);
        hashes2Hash = Hashes2Hash(_hashes2Hash);
    }

    /// @notice Creates a unique hash fingerprint from any text input by processing each character
    /// @dev Works in two steps:
    ///      1. Converts each UTF-8 character to a hash
    ///      2. Combines these hashes in pairs until only one remains (Merkle DAG style)
    /// @param input The text string to be converted into a hash
    /// @return A single 32-byte hash that uniquely represents the entire input string
    function press(string memory input) public returns (bytes32) {
        bytes memory stringBytes = bytes(input);
        stringLength = stringBytes.length;

        if (stringLength == 0) {
            revert DecxDAG_EmptyInput();
        }

        // Step 1: Convert the string to an array of hashes
        bytes32[] memory hashes = convertStringToHashes(stringBytes);

        // Step 2: Iteratively merge hashes using Hashes2Hash until a single hash remains
        bytes32 finalHash = reduceHashes(hashes);

        return finalHash;
    }

    /// @notice Takes a string and creates a hash for each UTF-8 character in it
    /// @dev Properly handles multi-byte UTF-8 characters (like emojis 😀 or accented letters é)
    ///      by detecting the byte length of each character and processing them accordingly.
    /// @param stringBytes The raw bytes of the input string
    /// @return An array where each element is a hash representing one character from the input
    function convertStringToHashes(bytes memory stringBytes) private returns (bytes32[] memory) {
        // Count actual UTF-8 characters
        // 1 byte: 0xxxxxxx (ie, a, b, c, etc.)
        // 2 bytes: 110xxxxx 10xxxxxx (ie, ü, é, à, etc.)
        // 3 bytes: 1110xxxx 10xxxxxx 10xxxxxx (ie, ﬀ, ﬁ, ﬂ, etc.)
        // 4 bytes: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (ie, 😀, 🌹, 💩, etc.)
        for (uint256 i = 0; i < stringLength;) {
            charCount++;
            // Skip the appropriate number of bytes based on UTF-8 encoding
            if ((stringBytes[i] & 0xf8) == 0xf0) i += 4;      // 4-byte character
            else if ((stringBytes[i] & 0xf0) == 0xe0) i += 3; // 3-byte character
            else if ((stringBytes[i] & 0xe0) == 0xc0) i += 2; // 2-byte character
            else i += 1;                                       // 1-byte character
        }

        // Initialize the array of hashes to be processed
        bytes32[] memory hashes = new bytes32[](charCount);
        uint256 hashIndex = 0;

        // Convert characters to hashes
        for (uint256 i = 0; i < stringLength;) {
            uint256 charLen;
            if ((stringBytes[i] & 0xf8) == 0xf0) charLen = 4;      // 4-byte character
            else if ((stringBytes[i] & 0xf0) == 0xe0) charLen = 3; // 3-byte character
            else if ((stringBytes[i] & 0xe0) == 0xc0) charLen = 2; // 2-byte character
            else charLen = 1;                                       // 1-byte character

            bytes memory charBytes = new bytes(charLen);
            for (uint256 j = 0; j < charLen; j++) {
                charBytes[j] = stringBytes[i + j];
            }

            string memory character = string(charBytes);
            hashes[hashIndex] = character2Hash.addCharacter2Hash(character);

            i += charLen;
            hashIndex++;
        }

        return hashes;
    }

    /// @notice Reduces an array of hashes into a single hash using Merkle DAG compression
    /// @dev Implements a bottom-up reduction using pairs of hashes. For odd numbers of hashes,
    ///      the last unpaired hash is promoted to the next level. Continues until only one hash remains.
    /// @param hashes The array of hashes to be reduced.
    /// @return The final computed hash.
    function reduceHashes(bytes32[] memory hashes) private returns (bytes32) {
        uint256 index = 0;
        while (charCount > 1) {
            // skip indices that have been processed or are out of bounds
            if (hashes[index] == bytes32(0) || index > stringLength) {
                index = 0;
            }
            // if this is the first pass and it's an odd number of hashes, move the last hash up
            if (hashes[index + 1] == bytes32(0)) {
                hashes[(index + 1) / 2] = hashes[index];
                hashes[index] = bytes32(0);
            }
            else {
                // default case: merge two hashes
                bytes32 newHash = hashes2Hash.addHashes2Hash([hashes[index], hashes[index + 1]]);
                // reset the two hashes to null
                hashes[index] = bytes32(0);
                hashes[index + 1] = bytes32(0);
                // store the new hash at the floor
                hashes[(index + 1) / 2] = newHash;
                // decrement the length
                charCount = charCount - 1;
                // increment the index
                index = index + 2;
            }
        }

        return hashes[0]; // The final computed hash
    }
}
