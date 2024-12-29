// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./AtomicUnit.sol";

contract CompositeUnit {
    AtomicUnit private atomicUnitContract;
    error CompositeUnit_InvalidAtomicUnits();
    error CompositeUnit_AtomicUnitNotFound();


    // mapping of composite hashes to true
    mapping(bytes32 => bool) private compositeHashMapping;

    constructor(address _atomicUnitAddress) {
        atomicUnitContract = AtomicUnit(_atomicUnitAddress);
    }

    function addCompositeUnit(bytes32[] memory atomicUnits) public returns (bytes32) {
        // first check if there are only two atomic units
        if (atomicUnits.length != 2) {
            revert CompositeUnit_InvalidAtomicUnits();
        }

        // ensure both the atomic units exist before proceeding
        if (!atomicUnitContract.isAtomicUnitPresent(atomicUnits[0]) ||
            !atomicUnitContract.isAtomicUnitPresent(atomicUnits[1])) {
            revert CompositeUnit_AtomicUnitNotFound();
        }

        bytes32 compositeHash = keccak256(abi.encode(atomicUnits));
        compositeHashMapping[compositeHash] = true;
        return compositeHash;
    }

    function isCompositeUnitPresent(bytes32 compositeHash) public view returns (bool) {
        return compositeHashMapping[compositeHash];
    }
}