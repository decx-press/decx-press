// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract DecxDAG {
    // TODO: The main contract managing interactions between Atomic, 
    // Composite, Blob, and Pressing Units.

    // NOTES:
    // - if a unit is created at any level, the following levels must be created as well
    // - if a unit does not need to be created at a level, we still may need to create higher level units
    // - how can we ensure cost efficiency if we dont know if a unit has been created at any arbitrary level?
}