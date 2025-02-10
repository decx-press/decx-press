// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./HashRegistry.sol";

contract Hashes2Hash{
    HashRegistry private hashRegistryContract;

    error Hashes2Hash_InvalidArgs();
    error Hashes2Hash_ZeroHashNotAllowed();

    constructor(address _hashRegistryAddress) {
        hashRegistryContract = HashRegistry(_hashRegistryAddress);
    }

    ///   @notice Add a Hashes2Hash unit to the contract.
    ///   @param hashArray The array of hashes to add to the contract.
    ///   @return The hash of the hashes.
    function addHashes2Hash(bytes32[2] memory hashArray) public returns (bytes32) {
        // ensure the hashes are not zero before sending to the hash registry
        if (hashArray[0] == bytes32(0) || hashArray[1] == bytes32(0)) {
            revert Hashes2Hash_ZeroHashNotAllowed();
        }

        // and send it to the hash registry for storage
        bytes32 hash = hashRegistryContract.addHashesHash(hashArray[0], hashArray[1]);

        return hash;
    }
}
