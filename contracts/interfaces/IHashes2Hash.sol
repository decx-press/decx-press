// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IHashes2Hash {

    /// @notice Add a hashes2hash to the contract.
    /// @param hashArray An array of exactly 2 hashes.
    /// @return The hash of the hashes2hash.
    function addHashes2Hash(bytes32[2] memory hashArray) external returns (bytes32);
}
