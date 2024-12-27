import { keccak256 } from "ethers";
import { AbiCoder } from "ethers";


/**
 * TODO: make several utility functions that can be used in tests
 * - generate a Composite Unit from an array of Atomic Units
 * - generate a Blob Unit from an array of Composite Units
 * - generate a Sentence Unit from an array of Blob Units
 * - generate a Pressing Unit from an array of Sentence Units
 */
export class TestUtils {
    /**
     * Generate an Atomic Unit from a string
     * @param str - The single character string to generate an Atomic Unit from
     * @returns The Atomic Unit
     */
    static GenerateAtomicUnit(str: string) {
        // NOTE:this may not be the same as the way solidity does it so beware!
        return keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [str]));
    }
}

