// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./decxDAG_units/Character2Hash.sol";
import "./decxDAG_units/Hashes2Hash.sol";

contract DecxDAG {
    error DecxDAG_EmptyInput();

    Character2Hash private character2Hash;
    Hashes2Hash private hashes2Hash;

    constructor(address _character2Hash, address _hashes2Hash) {
        character2Hash = Character2Hash(_character2Hash);
        hashes2Hash = Hashes2Hash(_hashes2Hash);
    }

    /// @notice Converts a string input into a single hash representation using Merkle DAG.
    /// @param input The input string to be processed.
    /// @return The final hash representing the full input string.
    function press(string memory input) public returns (bytes32) {
        bytes memory stringBytes = bytes(input);
        uint256 length = stringBytes.length;

        if (length == 0) {
            revert DecxDAG_EmptyInput();
        }

        // Step 1: Convert the string to an array of hashes
        (bytes32[] memory hashes, uint256 charCount) = convertStringToHashes(stringBytes, length);

        // Step 2: Iteratively merge hashes using Hashes2Hash until a single hash remains
        bytes32 finalHash = reduceHashes(hashes, charCount);

        return finalHash;
    }

    /// @notice Converts a string input into an array of hashes using Character2Hash.
    /// @param stringBytes The input string as a bytes array to be processed.
    /// @param length The length of the input string.
    /// @return The array of hashes and the number of characters in the input string.
    function convertStringToHashes(bytes memory stringBytes, uint256 length) private returns (bytes32[] memory, uint256) {
        // Count actual UTF-8 characters
        // 1 byte: 0xxxxxxx (ie, a, b, c, etc.)
        // 2 bytes: 110xxxxx 10xxxxxx (ie, ü, é, à, etc.)
        // 3 bytes: 1110xxxx 10xxxxxx 10xxxxxx (ie, ﬀ, ﬁ, ﬂ, etc.)
        // 4 bytes: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (ie, 😀, 🌹, 💩, etc.)
        uint256 charCount = 0;
        for (uint256 i = 0; i < length;) {
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
        for (uint256 i = 0; i < length;) {
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

        return (hashes, charCount);
    }

    /// @notice Reduces an array of hashes into a single hash using Hashes2Hash.
    /// @param hashes The array of hashes to be reduced.
    /// @param charCount The number of characters in the input string.
    /// @return The final computed hash.
    function reduceHashes(bytes32[] memory hashes, uint256 charCount) private returns (bytes32) {
        uint256 index = 0;
        while (charCount > 1) {
            // skip indices that have been processed or are out of bounds
            if (hashes[index] == bytes32(0) || index > length) {
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
