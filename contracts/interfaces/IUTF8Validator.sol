// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IUTF8Validator {
    /// @notice Errors that can be thrown during validation
    error UTF8_InvalidCharacter();
    error UTF8_Incomplete4ByteSequence();
    error UTF8_Incomplete3ByteSequence();
    error UTF8_Incomplete2ByteSequence();
    error UTF8_InvalidLeadingByte();
    error UTF8_InvalidContinuationByte();
    error UTF8_ControlCharacterNotAllowed();

    /// @notice Validates a single UTF-8 character
    /// @dev Checks for valid UTF-8 encoding and disallows control characters
    /// @param character The string containing exactly one UTF-8 character
    function validateCharacter(string calldata character) external pure;
}