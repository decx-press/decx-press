import { keccak256 } from "ethers";
import { AbiCoder } from "ethers";
import { ethers } from "hardhat";

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

    /**
     * Calculates gas fees for an array of receipts
     * @param receipt - An array of receipts
     * @returns Void, prints a console table with the gas fees & USD conversion
     */
    static async PrintGasFees(receipts: any[]) {
        // store these for calculations below
        const ethPrice = await this.GetEthPrice();
        const gasPrice = await this.GetGasPrice();

        // generate a console table with the gas fees & USD conversion
        return console.table(receipts.map((receipt, index) => {
            // if no operation is given, use a default one
            if (!receipt.operation) {
                receipt.operation = `no operation given`;
            }

            const gasCost = Number(receipt.gasUsed) * Number(gasPrice.gasPrice);
            const ethCost = ethers.formatEther(gasCost.toString());
            const usdPrice = Number(ethCost) * Number(ethPrice);

            return {
                operation: `#${index + 1} ${receipt.operation}`,
                "Gas used": receipt.gasUsed.toString(),
                "USD cost": `$${usdPrice.toFixed(4)}`
            };
        }));
    }

    /**
     * Get the current gas price
     * @returns The current gas price
     */
    private static async GetGasPrice() {
        return await ethers.provider.getFeeData();
    }

    /**
     * Get the current ETH price
     * @returns The current ETH price
     */
    private static async GetEthPrice() {
        // use coingecko api for USD price
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        return data.ethereum.usd;
    }
}

