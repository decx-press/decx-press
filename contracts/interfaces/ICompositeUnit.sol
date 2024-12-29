// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ICompositeUnit {
    /**
        @dev Add a composite unit to the contract.
        @param atomicUnits The atomic units to add to the composite unit.
        @return The hash of the composite unit.
    */
    function addCompositeUnit(bytes32[] memory atomicUnits) external returns (bytes32);

    /**
        @dev Check if a composite unit is present in the contract.
        @param hash The hash of the composite unit to check.
        @return True if the composite unit is present, false otherwise.
    */
    function isCompositeUnitPresent(bytes32 hash) external view returns (bool);
}