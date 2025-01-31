// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ICharacter2Hash {
    /**
        @dev Add an atomic unit to the contract.
        @param character The UTF character to add to the contract.
        @return The hash of the character.
    */
    function addCharacter2Hash(string memory character) external returns (bytes32);

    /**
        @dev Check if an atomic unit is present in the contract.
        @param hash The hash of the atomic unit to check.
        @return True if the atomic unit is present, false otherwise.
    */
    function isCharacter2HashPresent(bytes32 hash) external view returns (bool);

    /**
        @dev Get the hash of an atomic unit.
        @param character The character to get the hash of.
        @return The hash of the character.
    */
    function getCharacter2HashHash(string memory character) external view returns (bytes32);

    /**
        @dev Get the hash of an atomic unit.
        @param character The character to get the hash of.
        @return The hash of the character.
    */
    function atomicLookup(string memory character) external view returns (bytes32);
}