// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./HashRegistry.sol";

contract Hashes2Hash{
    HashRegistry private hashRegistryContract;

    error Hashes2Hash_InvalidArgs();
    error Hashes2Hash_InvalidHash();

    constructor(address _hashRegistryAddress) {
        hashRegistryContract = HashRegistry(_hashRegistryAddress);
    }

    function addHashes2Hash(bytes32[] memory hashArray) public returns (bytes32) {
       
        if (hashArray.length != 2) {
            revert Hashes2Hash_InvalidArgs();
        }

        // check if the hash pair already exists
        // if (isHashPairPresent(hashArray[0], hashArray[1])) {
        //     return Hash2HashesLookup[hashArray[0]][hashArray[1]];
        // }
        
        // return the composite hash
        return hashRegistryContract.addCompositeHash(hashArray[0], hashArray[1]);
    }
}
