// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./decxDAG_units/Character2Hash.sol";
import "./decxDAG_units/Hashes2Hash.sol";

contract DecxDAG {
    error DecxDAG_EmptyStringNotAllowed();

    Character2Hash private character2Hash;
    Hashes2Hash private hashes2Hash;

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

    /// @notice Takes a string and creates a hash for each UTF-8 character in it
    /// @dev Properly handles multi-byte UTF-8 characters (like emojis 😀 or accented letters é)
    ///      by detecting the byte length of each character and processing them accordingly.
    /// @param stringBytes The raw bytes of the input string
    /// @return hashes An array where each element is a hash representing one character from the input
    /// @return charCount The number of UTF-8 characters processed
    function convertStringToHashes(bytes memory stringBytes) private returns (bytes32[] memory hashes, uint256 charCount) {
        uint256 stringLength = stringBytes.length;
        uint256 maxChars = stringLength; // Worst case: all single-byte characters
        hashes = new bytes32[](maxChars);
        charCount = 0;

        // Process each character
        for (uint256 i = 0; i < stringLength;) {
            // Extract the next character
            uint256 charLen;
            if ((stringBytes[i] & 0xf8) == 0xf0) charLen = 4;      // 4-byte character
            else if ((stringBytes[i] & 0xf0) == 0xe0) charLen = 3; // 3-byte character
            else if ((stringBytes[i] & 0xe0) == 0xc0) charLen = 2; // 2-byte character
            else charLen = 1;                                       // 1-byte character

            bytes memory charBytes = new bytes(charLen);
            for (uint256 j = 0; j < charLen; j++) {
                charBytes[j] = stringBytes[i + j];
            }

            // Let character2Hash (which uses UTF8Validator) handle validation
            string memory character = string(charBytes);
            hashes[charCount] = character2Hash.addCharacter2Hash(character);

            i += charLen;
            charCount++;
        }

        return (hashes, charCount);
    }

    /// @notice Reduces an array of hashes into a single hash using Merkle DAG compression
    /// @dev Implements a bottom-up reduction using pairs of hashes. For odd numbers of hashes,
    ///      the last unpaired hash is promoted to the next level. Continues until only one hash remains.
    /// @param hashes The array of hashes to be reduced
    /// @param length The number of valid hashes in the array
    /// @return The final computed hash
    function reduceHashes(bytes32[] memory hashes, uint256 length) private returns (bytes32) {
        uint256 currentLength = length;

        while (currentLength > 1) {
            // Create new array of half size (rounded up)
            uint256 newLength = (currentLength + 1) / 2;
            bytes32[] memory newHashes = new bytes32[](newLength);

            // Process pairs
            for (uint256 i = 0; i + 1 < currentLength; i += 2) {
                newHashes[i/2] = hashes2Hash.addHashes2Hash([hashes[i], hashes[i + 1]]);
            }

            // Handle last element if odd length
            if (currentLength % 2 == 1) {
                newHashes[newLength - 1] = hashes[currentLength - 1];
            }

            // Update for next iteration
            hashes = newHashes;
            currentLength = newLength;
        }

        return hashes[0];
    }
}
