import { Request, Response } from "express";
import { ethers } from "ethers";
import { getProvider, getSigner } from "../services/walletService";

export const getBalance = async (req: Request, res: Response) => {
    try {
        // Get wallet address from query parameter or use server's wallet
        const walletAddress = (req.query.address as string) || getSigner().address;

        console.log(`[BLN] [${new Date().toISOString()}] Checking wallet balance for address: ${walletAddress}`);

        // Get current network info
        const provider = getProvider();
        const network = await provider.getNetwork();

        const balance = await provider.getBalance(walletAddress);
        const balanceInEth = ethers.formatEther(balance);
        console.log(
            `[BLN] [${new Date().toISOString()}] Wallet balance: ${balanceInEth} ETH on ${network.name} (Chain ID: ${network.chainId})`
        );

        // Get network gas prices for reference
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("0", "gwei");
        const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");

        // Estimate how many transactions can be sent with current balance
        // Assuming 500,000 gas limit per transaction
        const gasLimit = 500000;
        const gasCost = gasPrice * BigInt(gasLimit);
        const txCount = gasCost > 0 ? balance / gasCost : 0;

        // Calculate recommended balance for at least one transaction
        const recommendedBalance = gasCost * BigInt(3); // 3x safety buffer
        const needsMoreFunds = balance < gasCost;

        return res.json({
            success: true,
            address: walletAddress,
            network: {
                name: network.name,
                chainId: network.chainId.toString(),
                rpcUrl: process.env.RPC_URL
            },
            balanceWei: balance.toString(),
            balanceEth: balanceInEth,
            networkGasPrice: gasPriceGwei + " gwei",
            estimatedTxCount: Math.floor(Number(txCount)),
            sufficientFunds: !needsMoreFunds,
            recommendedMinBalanceWei: recommendedBalance.toString(),
            recommendedMinBalanceEth: ethers.formatEther(recommendedBalance)
        });
    } catch (error) {
        console.error(`[BLN] [${new Date().toISOString()}] Error checking wallet balance:`, error);
        return res.status(500).json({
            success: false,
            error: "Failed to check wallet balance",
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
