// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./AtomicUnit.sol";

contract CompositeUnit {
    AtomicUnit private atomicUnitContract;
    error CompositeUnit_InvalidArgs();
    error CompositeUnit_InvalidHash();


    // mappings of composite hashes to true
    mapping(bytes32 => bool) private compositeHashMapping;
    // mappings of atomic hashes to composite hashes
    mapping(bytes32 => mapping(bytes32 => bytes32)) private compositeHashPairs;

    constructor(address _atomicUnitAddress) {
        atomicUnitContract = AtomicUnit(_atomicUnitAddress);
    }

    function addCompositeUnit(bytes32[] memory hashArray) public returns (bytes32) {
        // first check if there are only two atomic units
        if (hashArray.length != 2) {
            revert CompositeUnit_InvalidArgs();
        }

        // ensure both the atomic units exist before proceeding
        if (!atomicUnitContract.isAtomicUnitPresent(hashArray[0]) ||
            !atomicUnitContract.isAtomicUnitPresent(hashArray[1])) {
            revert CompositeUnit_InvalidHash();
        }

        // check if the hash pair already exists
        if (isHashPairPresent(hashArray[0], hashArray[1])) {
            return compositeHashPairs[hashArray[0]][hashArray[1]];
        }

        // generate the composite hash
        bytes32 compositeHash = keccak256(abi.encode(hashArray));
        // store the composite hash
        compositeHashMapping[compositeHash] = true;
        // store the explicit hash pair
        compositeHashPairs[hashArray[0]][hashArray[1]] = compositeHash;

        // return the composite hash
        return compositeHash;
    }

    function isCompositeUnitPresent(bytes32 compositeHash) public view returns (bool) {
        return compositeHashMapping[compositeHash];
    }

    function isHashPairPresent(bytes32 hashA, bytes32 hashB) public view returns (bool) {
        return compositeHashPairs[hashA][hashB] != bytes32(0);
    }

    function getCompositeHash(bytes32 hashA, bytes32 hashB) public view returns (bytes32) {
        return compositeHashPairs[hashA][hashB];
    }
}
