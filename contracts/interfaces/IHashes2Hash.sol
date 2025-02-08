// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IHashes2Hash {
    /**
        @dev Add a hashes2hash to the contract.
        @param hashArray An array of arbitrary hashes.
        @return The hash of the hashes2hash.
    */
    function addHashes2Hash(
        bytes32[] memory hashArray
    ) external returns (bytes32);
}
