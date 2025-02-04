// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./HashRegistry.sol";

contract Hashes2Hash{
    HashRegistry private hashRegistryContract;

    error Hashes2Hash_InvalidArgs();
    error Hashes2Hash_InvalidHash();


    // mappings of composite hashes to true
    mapping(bytes32 => bool) private Hash2HashesExists;
    // mappings of atomic hashes to composite hashes
    mapping(bytes32 => mapping(bytes32 => bytes32)) private Hash2HashesLookup;

    constructor(address _hashRegistryAddress) {
        hashRegistryContract = HashRegistry(_hashRegistryAddress);
    }

    function addHashes2Hash(bytes32[] memory hashArray) public returns (bytes32) {
       
        if (hashArray.length != 2) {
            revert Hashes2Hash_InvalidArgs();
        }
        // ensure both the Character2Hash units exist before proceeding
        if (!hashRegistryContract.isHashPresent(hashArray[0]) ||
            !hashRegistryContract.isHashPresent(hashArray[1])) {
            revert Hashes2Hash_InvalidHash();
        }

        // check if the hash pair already exists
        if (isHashPairPresent(hashArray[0], hashArray[1])) {
            return Hash2HashesLookup[hashArray[0]][hashArray[1]];
        }

        // generate the composite hash
        bytes32 compositeHash = keccak256(abi.encode(hashArray));
        // store the composite hash
        Hash2HashesExists[compositeHash] = true;
        // store the explicit hash pair
        Hash2HashesLookup[hashArray[0]][hashArray[1]] = compositeHash;

        // return the composite hash
        return compositeHash;
    }

    function isHashes2HashPresent(bytes32 compositeHash) public view returns (bool) {
        return Hash2HashesExists[compositeHash];
    }

    function isHashPairPresent(bytes32 hashA, bytes32 hashB) public view returns (bool) {
        return Hash2HashesLookup[hashA][hashB] != bytes32(0);
    }

    function getCompositeHash(bytes32 hashA, bytes32 hashB) public view returns (bytes32) {
        return Hash2HashesLookup[hashA][hashB];
    }
}
