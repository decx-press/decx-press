// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract AtomicUnit {
    error AtomicUnit_InvalidCharacter();

    // mapping of atomic hashes to true
    mapping(bytes32 => bool) public atomicHashMapping;
    // mapping of atomic characters to their corresponding hash
    mapping(string => bytes32) public atomicLookupMapping;

    /**
     *   @dev Add an atomic unit to the contract.
     *   @param character The UTF character to add to the contract.
     *   @return The hash of the character.
    */
    function addAtomicUnit(string memory character) public returns (bytes32) {
        // first check if the character is valid
        if (!isCharacterValid(character)) {
            revert AtomicUnit_InvalidCharacter();
        }

        // first check if the character is already in the contract
        if (atomicLookupMapping[character] != bytes32(0)) {
            return atomicLookupMapping[character];
        }

        // hash the encoded character using keccak256
        bytes32 hash = keccak256(abi.encode((character)));

        // add the hash to the hash & lookup mappings
        atomicHashMapping[hash] = true;
        atomicLookupMapping[character] = hash;

        return hash;
    }

    /**
     *  @dev Check if an atomic unit is present in the contract.
     *   @param hash The hash of the atomic unit to check.
     *   @return True if the atomic unit is present, false otherwise.
    */
    function isAtomicUnitPresent(bytes32 hash) public view returns (bool) {
        return atomicHashMapping[hash];
    }

    /**
     *  @dev Get the hash of an atomic unit.
     *  @param character The character to get the hash of.
     *  @return The hash of the character.
     */
    function getAtomicUnitHash(string memory character) public view returns (bytes32) {
        return atomicLookupMapping[character];
    }

    /**
     *  @dev Get the hash of an atomic unit.
     *  @param character The character to get the hash of.
     *  @return The hash of the character.
    */
    function atomicLookup(string memory character) public view returns (bytes32) {
        return atomicLookupMapping[character];
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
        if (l == 0 || l > 4) return false;  // UTF-8 characters are 1-4 bytes

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
            } else { // l == 4
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