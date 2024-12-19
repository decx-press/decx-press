// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract AtomicUnit {
    error AtomicUnit_InvalidCharacter();

    // mapping of atomic hashes to true
    mapping(bytes32 => bool) private atomicHashMapping;

    // mapping of atomic characters to their corresponding hash
    mapping(string => bytes32) private atomicLookupMapping;

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

    function isCharacterValid(string memory character) private pure returns (bool) {
        // Ensure the input is exactly 1 byte
        if (bytes(character).length != 1) {
            return false;
        }

        // Get the single byte of the character
        bytes1 charByte = bytes(character)[0];

        // Disallow control characters (ASCII 0x00 - 0x1F and 0x7F)
        if ((charByte >= 0x00 && charByte <= 0x1F) || charByte == 0x7F) {
            return false;
        }

        // Disallow non-breaking space
        if (charByte == 0xA0) {
            return false;
        }

        return true;
    }
}