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
     * Generate a random string of a given length
     * @param length - The length of the string to generate
     * @returns The generated string
     */ 
    static GenerateRandomString(length: number) {
        return Math.random().toString(36).substring(2, length + 2);
    }

    /**
     * Generate an Atomic Unit from a string
     * @param str - The single character to generate an hash from
     * @returns The encoded Atomic Unit
     */
    static GenerateHashFromChar(str: string) {
        // NOTE:this may not be the same as the way solidity does it so beware!
        return keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [str]));
    }

    /**
     * Generate a Composite Unit from two Atomic Units
     * @param hashes - An array arbitrary keccak256 hashes
     * @returns The encoded Composite Unit
     */
    static GenerateHashFromHashes(hashes: string[]) {
        return keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32[]"], [hashes]));
    }
}
