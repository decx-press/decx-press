// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../interfaces/IUTF8Validator.sol";

contract UTF8Validator is IUTF8Validator {
    function validateCharacter(string calldata character) external pure override {
        bytes calldata b = bytes(character);
        uint256 l = b.length;
        if (l == 0 || l > 4) revert UTF8_InvalidCharacter();

        bytes1 firstByte = b[0];

        // Determine expected length from first byte
        if (firstByte < 0x80) {
            // Single-byte (ASCII)
            if (l != 1) revert UTF8_InvalidCharacter();
        } else if (firstByte < 0xC0) {
            // 10xxxxxx as first byte → invalid
            revert UTF8_InvalidLeadingByte();
        } else if (firstByte < 0xE0) {
            // 110xxxxx
            if (l != 2) revert UTF8_InvalidCharacter();
        } else if (firstByte < 0xF0) {
            // 1110xxxx
            if (l != 3) revert UTF8_InvalidCharacter();
        } else {
            // >= 0xF0 → 11110xxx
            if (l != 4) revert UTF8_InvalidCharacter();
        }

        // Multi-byte path
        if (l > 1) {
            for (uint256 i = 1; i < l; i++) {
                bytes1 contByte = b[i];
                if (contByte < 0x80 || contByte > 0xBF) revert UTF8_InvalidContinuationByte();
            }
        } else {
            // Single-byte path
            if (firstByte <= 0x1F || firstByte == 0x7F) {
                revert UTF8_ControlCharacterNotAllowed();
            }
        }
    }
}