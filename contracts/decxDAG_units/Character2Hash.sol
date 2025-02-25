// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./DecxRegistry.sol";
import "../interfaces/IUTF8Validator.sol";
import "../interfaces/ICharacter2Hash.sol";

contract Character2Hash is ICharacter2Hash {

    DecxRegistry private decxRegistry;
    IUTF8Validator private utf8Validator;

    constructor(address _decxRegistryAddress, address _utf8ValidatorAddress) {
        decxRegistry = DecxRegistry(_decxRegistryAddress);
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

        // Use the decxregistry to add the character and get the hash
        bytes32 hash = decxRegistry.addCharacterHash(character);

        return hash;
    }
}
