// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./HashRegistry.sol";

contract Hashes2Hash {
    HashRegistry private hashRegistryContract;

    error Hashes2Hash_InvalidArgs();

    constructor(address _hashRegistryAddress) {
        hashRegistryContract = HashRegistry(_hashRegistryAddress);
    }

    function addHashes2Hash(bytes32[] memory hashArray) public returns (bytes32) {
        // ensure the hash array is of length 2
        if (hashArray.length != 2) {
            revert Hashes2Hash_InvalidArgs();
        }

        // and send it to the hash registry for storage
        bytes32 hash = hashRegistryContract.addHashesHash(hashArray[0], hashArray[1]);

        return hash;
    }
}
