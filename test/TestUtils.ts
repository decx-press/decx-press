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
     * @param str - The single character string to generate an Atomic Unit from
     * @returns The encoded Atomic Unit
     */
    static GenerateAtomicUnit(str: string) {
        // NOTE:this may not be the same as the way solidity does it so beware!
        return keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [str]));
    }

    /**
     * Generate a Composite Unit from two Atomic Units
     * @param str1 - A single character string
     * @param str2 - A single character string
     * @returns The encoded Composite Unit
     */
    static GenerateCompositeUnit(str1: string, str2: string) {
        const hash1 = TestUtils.GenerateAtomicUnit(str1);
        const hash2 = TestUtils.GenerateAtomicUnit(str2);
        return keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [hash1, hash2]));
    }

    /**
     * Generate a Blob Unit from two Composite Units
     * @param str - A string consisting of 4 characters
     * @returns The encoded Blob Unit
     */
    static GenerateBlobUnit(str: string) {
        if (str.length !== 4) {
            throw new Error("String must be 4 characters long to generate a Blob Unit");
        }
        const hash1 = TestUtils.GenerateCompositeUnit(str[0], str[1]);
        const hash2 = TestUtils.GenerateCompositeUnit(str[2], str[3]);
        return keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [hash1, hash2]));
    }

    /**
     * Generate a Phrase Unit from two Blob Units
     * @param str1 - A novel 4 character string to generate a Phrase Unit from
     * @param str2 - A novel 4 character string to generate a Phrase Unit from
     * @returns The encoded Phrase Unit
     */
    static GeneratePhraseUnit(str1: string, str2: string) {
        if (str1.length !== 4 || str2.length !== 4) {
            throw new Error("Strings must be 4 characters long to generate a Phrase Unit");
        }
        const hash1 = TestUtils.GenerateBlobUnit(str1);
        const hash2 = TestUtils.GenerateBlobUnit(str2);
        return keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [hash1, hash2]));
    }

    /**
     * Generate a Sentence Unit from two Phrase Units
     * @param str1 - A novel 8 character string to generate a Sentence Unit from
     * @param str2 - A novel 8 character string to generate a Sentence Unit from
     * @returns The encoded Sentence Unit
     */
    static GenerateSentenceUnit(str1: string, str2: string) {
        if (str1.length !== 8 || str2.length !== 8) {
            throw new Error("Strings must be 8 characters long to generate a Sentence Unit");
        }
        const hash1 = TestUtils.GeneratePhraseUnit(str1.slice(0, 4), str1.slice(4, 8));
        const hash2 = TestUtils.GeneratePhraseUnit(str2.slice(0, 4), str2.slice(4, 8));
        return keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [hash1, hash2]));
    }

    /**
     * Generate a Pressing Unit from two Sentence Units
     * @param str1 - The first character string to generate a Pressing Unit from
     * @param str2 - The second character string to generate a Pressing Unit from
     * @returns The encoded Pressing Unit
     */
    static GeneratePressingUnit(str1: string, str2: string) {
        const hash1 = TestUtils.GenerateSentenceUnit(str1, str2);
        const hash2 = TestUtils.GenerateSentenceUnit(str2, str1);
        return keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [hash1, hash2]));
    }
}

