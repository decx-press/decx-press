// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../interfaces/IUTF8Validator.sol";

contract UTF8Validator is IUTF8Validator {
    function validateCharacter(string memory character) public pure override {
        bytes memory b = bytes(character);
        uint256 l = b.length;

        // First check: length must be 1-4 bytes
        if (l == 0 || l > 4) revert UTF8_InvalidCharacter();

        bytes1 firstByte = b[0];

        // Determine expected length based on first byte
        uint256 expectedLength;
        if (firstByte >= 0xF0) expectedLength = 4;      // 11110xxx
        else if (firstByte >= 0xE0) expectedLength = 3; // 1110xxxx
        else if (firstByte >= 0xC0) expectedLength = 2; // 110xxxxx
        else if (firstByte >= 0x80) revert UTF8_InvalidLeadingByte(); // 10xxxxxx is never valid as first byte
        else expectedLength = 1;                        // 0xxxxxxx

        // Check if actual length matches expected length
        if (l != expectedLength) revert UTF8_InvalidCharacter();

        // Now validate based on length
        if (l >= 2) {
            // Multi-byte validation...
            // Validate continuation bytes (must be 10xxxxxx)
            for (uint i = 1; i < l; i++) {
                bytes1 contByte = b[i];
                if (contByte < 0x80 || contByte > 0xBF) revert UTF8_InvalidContinuationByte();
            }
        } else {
            // Single byte validation...
            // Single byte must be valid ASCII (0x20-0x7F)
            if (firstByte <= 0x1F || firstByte == 0x7F) {
                revert UTF8_ControlCharacterNotAllowed();
            }
        }
    }
}