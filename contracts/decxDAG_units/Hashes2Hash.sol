// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./DecxRegistry.sol";
import "../interfaces/IHashes2Hash.sol";

contract Hashes2Hash is IHashes2Hash {
    DecxRegistry private decxRegistryContract;

    constructor(address _decxRegistryAddress) {
        decxRegistryContract = DecxRegistry(_decxRegistryAddress);
    }

    ///   @notice Add a Hashes2Hash unit to the contract.
    ///   @param hashArray The array of hashes to add to the contract.
    ///   @return The hash of the hashes.
    function addHashes2Hash(bytes32[2] memory hashArray) public returns (bytes32) {
        // ensure the hashes are not zero before sending to the decxregistry
        if (hashArray[0] == bytes32(0) || hashArray[1] == bytes32(0)) {
            revert Hashes2Hash_ZeroHashNotAllowed();
        }

        // and send it to the decxregistry for storage
        bytes32 hash = decxRegistryContract.addHashesHash(hashArray[0], hashArray[1]);

        return hash;
    }
}
