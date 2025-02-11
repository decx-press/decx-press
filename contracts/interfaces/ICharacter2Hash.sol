// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ICharacter2Hash {
    /**
        @dev Add a Character2Hash unit to the contract.
        @param character The UTF character to add to the contract.
        @return The hash of the character.
    */
    function addCharacter2Hash(string memory character) external returns (bytes32);
}
