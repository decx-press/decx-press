import { Request, Response } from "express";
import {
    getSigner,
    getContract,
    createWalletFromPrivateKey,
    createContractWithSigner,
    getDekService
} from "../services/walletService";
import { storeTransaction } from "../services/transactionStore";
import { v4 as uuidv4 } from "uuid";

export const pressContent = async (req: Request, res: Response) => {
    const requestId = uuidv4();
    console.log(`[PRS] [${new Date().toISOString()}] [${requestId}] Received press request`);

    try {
        const { content, privateKey, recipientPublicKey } = req.body;

        if (!content) {
            console.error(`[PRS] [${new Date().toISOString()}] [${requestId}] Missing content in request`);
            return res.status(400).json({
                success: false,
                error: "Missing content in request"
            });
        }

        // Create signer and contract if private key is provided
        let signer = getSigner();
        let contract = getContract();
        let signerAddress = signer.address;

        if (privateKey) {
            console.log(
                `[PRS] [${new Date().toISOString()}] [${requestId}] Using provided private key for transaction`
            );
            signer = createWalletFromPrivateKey(privateKey);
            contract = createContractWithSigner(signer);
            signerAddress = signer.address;
            console.log(
                `[PRS] [${new Date().toISOString()}] [${requestId}] Transaction signer address: ${signerAddress}`
            );
        }

        // Get DEK service
        const dekService = getDekService();

        // Press the content
        console.log(
            `[PRS] [${new Date().toISOString()}] [${requestId}] Pressing content with length: ${content.length}`
        );
        const { finalHash, transactionHash, encryptedContents } = await dekService.press(content, recipientPublicKey);

        // Store transaction hash
        storeTransaction(requestId, { hash: transactionHash });

        console.log(`[PRS] [${new Date().toISOString()}] [${requestId}] Content pressed successfully`);
        return res.json({
            success: true,
            requestId,
            contentHash: finalHash,
            transactionHash,
            encryptedContents,
            signerAddress
        });
    } catch (error) {
        console.error(`[PRS] [${new Date().toISOString()}] [${requestId}] Error pressing content:`, error);
        return res.status(500).json({
            success: false,
            error: "Failed to press content",
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
