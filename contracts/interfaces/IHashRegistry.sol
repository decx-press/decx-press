// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IHashRegistry {
    /**
        @dev Add an atomic unit to the contract.
        @param character The UTF character to add to the contract.
        @return The hash of the character.
    */
    function addCharacterHash(string memory character, bytes32 hash) external returns (bytes32);

    /**
        @dev Check if a hash is present in the contract.
        @param hash The hash to check.
        @return True if the hash is present, false otherwise.
    */
    function isHashPresent(bytes32 hash) external returns (bool);

    /**
        @dev Get the hash for a character.
        @param character The character to get the hash for.
        @return The hash of the character.
    */
    function getHashForCharacter(string memory character) external returns (bytes32);
}