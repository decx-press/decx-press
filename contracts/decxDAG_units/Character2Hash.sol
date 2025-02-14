// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./HashRegistry.sol";
import "../interfaces/IUTF8Validator.sol";
import "../interfaces/ICharacter2Hash.sol";

contract Character2Hash is ICharacter2Hash {

    HashRegistry private hashRegistry;
    IUTF8Validator private utf8Validator;

    constructor(address _hashRegistryAddress, address _utf8ValidatorAddress) {
        hashRegistry = HashRegistry(_hashRegistryAddress);
        utf8Validator = IUTF8Validator(_utf8ValidatorAddress);
    }

    /**
     *   @dev Add a Character2Hash unit to the contract.
     *   @param character The UTF character to add to the contract.
     *   @return The hash of the character.
     */
    function addCharacter2Hash(string memory character) public returns (bytes32) {
        // Validate the character using the UTF8Validator
        utf8Validator.validateCharacter(character);

        // Use the hash registry to add the character and get the hash
        bytes32 hash = hashRegistry.addCharacterHash(character);

        return hash;
    }

    /**
     *  @dev Check if a character is valid.
     *  @param character The character to check.
     *  @return True if the character is valid, false otherwise.
     */
    function isCharacterValid(string memory character) private pure returns (bool) {
        bytes memory b = bytes(character);
        uint256 l = b.length;

        // Check if it's empty or too long to be a single UTF-8 character
        if (l == 0 || l > 4) return false; // UTF-8 characters are 1-4 bytes

        // Get the first byte
        bytes1 firstByte = b[0];

        if (l == 1) {
            // For ASCII characters (0x00-0x7F)
            // Disallow control characters
            if (firstByte <= 0x1F || firstByte == 0x7F) {
                return false;
            }
        } else {
            // Multi-byte UTF-8 validation
            if (l == 2) {
                // 2-byte UTF-8 (0x80-0x7FF)
                // First byte must be 110xxxxx (0xC0-0xDF)
                if (firstByte < 0xC0 || firstByte > 0xDF) return false;
            } else if (l == 3) {
                // 3-byte UTF-8 (0x800-0xFFFF)
                // First byte must be 1110xxxx (0xE0-0xEF)
                if (firstByte < 0xE0 || firstByte > 0xEF) return false;
            } else {
                // l == 4
                // 4-byte UTF-8 (0x10000-0x10FFFF)
                // First byte must be 11110xxx (0xF0-0xF7)
                if (firstByte < 0xF0 || firstByte > 0xF7) return false;
            }

            // Validate continuation bytes (must be 10xxxxxx)
            for (uint i = 1; i < l; i++) {
                bytes1 contByte = b[i];
                if (contByte < 0x80 || contByte > 0xBF) return false;
            }
        }

        return true;
    }
}
