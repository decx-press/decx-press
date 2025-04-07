import { Request, Response } from "express";
import { getDekService } from "../services/walletService";
import { getTransaction } from "../services/transactionStore";

export const getTransactionStatus = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            console.error(`[STAT] [${new Date().toISOString()}] Missing requestId in request`);
            return res.status(400).json({
                success: false,
                error: "Missing requestId in request"
            });
        }

        // Get transaction data from store
        const transactionData = getTransaction(requestId);
        if (!transactionData) {
            console.error(`[STAT] [${new Date().toISOString()}] No transaction found for requestId: ${requestId}`);
            return res.status(404).json({
                success: false,
                error: "No transaction found for requestId"
            });
        }

        // If there was an error, return it
        if (transactionData.error) {
            console.log(
                `[STAT] [${new Date().toISOString()}] Found error for requestId ${requestId}: ${transactionData.error}`
            );
            return res.json({
                success: false,
                error: transactionData.error
            });
        }

        // If there's no hash, return an error
        if (!transactionData.hash) {
            console.error(`[STAT] [${new Date().toISOString()}] No transaction hash found for requestId: ${requestId}`);
            return res.status(404).json({
                success: false,
                error: "No transaction hash found for requestId"
            });
        }

        // Get DEK service
        const dekService = getDekService();

        // Check transaction status
        console.log(`[STAT] [${new Date().toISOString()}] Checking status for transaction: ${transactionData.hash}`);
        const status = await dekService.checkTransactionStatus(transactionData.hash);

        console.log(`[STAT] [${new Date().toISOString()}] Transaction status:`, status);
        return res.json({
            success: true,
            requestId,
            transactionHash: transactionData.hash,
            ...status
        });
    } catch (error) {
        console.error(`[STAT] [${new Date().toISOString()}] Error checking transaction status:`, error);
        return res.status(500).json({
            success: false,
            error: "Failed to check transaction status",
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
