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
     * Generate a Character2Hash unit from a string
     * @param str - The single character to generate an hash from
     * @returns The encoded Character2Hash Unit
     */
    static GenerateHashFromChar(str: string) {
        // NOTE:this may not be the same as the way solidity does it so beware!
        return keccak256(AbiCoder.defaultAbiCoder().encode(["string"], [str]));
    }

    /**
     * Generate a Composite Unit from two Character2Hash Units
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

        // neatly exit out if we can't get the ETH price so we don't break the test
        if (!ethPrice) {
            console.warn("Failed to fetch ETH price, likely due to rate limiting. Try again later.");
            return;
        }

        // uncomment to see ETH price
        // console.log(`ETH price: ${ethPrice}`);

        // generate a console table with the gas fees & USD conversion
        return console.table(receipts.map((receipt) => {
            // if no operation is given, use a default one
            if (!receipt.operation) {
                receipt.operation = `no operation given`;
            }

            const gasCost = Number(receipt.gasUsed) * Number(receipt.gasPrice);
            const ethCost = ethers.formatEther(gasCost.toString());
            const usdPrice = Number(ethCost) * Number(ethPrice);

            return {
                "Operation": `${receipt.operation}`,
                "Gas price": receipt.gasPrice.toString(),
                "Gas fee": receipt.gasUsed.toString(),
                "In USD": `$${usdPrice.toFixed(4)}`
            };
        }));
    }

    /**
     * Get the fee data
     * @returns The an object with the fee data
     * https://docs.ethers.org/v5/api/providers/types/#providers-FeeData
     */
    private static async GetFeeData() {
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
        // conditionally get the price (we may encouner rate limiting)
        const ethPrice = data.ethereum?.usd;
        return ethPrice;
    }
}

