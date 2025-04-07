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

export const releaseContent = async (req: Request, res: Response) => {
    const requestId = uuidv4();
    console.log(`[REL] [${new Date().toISOString()}] [${requestId}] Received release request`);

    try {
        const { finalHash, privateKey, recipientPublicKey, localEncryptedContents } = req.body;

        if (!finalHash) {
            console.error(`[REL] [${new Date().toISOString()}] [${requestId}] Missing finalHash in request`);
            return res.status(400).json({
                success: false,
                error: "Missing finalHash in request"
            });
        }

        // Create signer and contract if private key is provided
        let signer = getSigner();
        let contract = getContract();
        let signerAddress = signer.address;

        if (privateKey) {
            console.log(
                `[REL] [${new Date().toISOString()}] [${requestId}] Using provided private key for transaction`
            );
            signer = createWalletFromPrivateKey(privateKey);
            contract = createContractWithSigner(signer);
            signerAddress = signer.address;
            console.log(
                `[REL] [${new Date().toISOString()}] [${requestId}] Transaction signer address: ${signerAddress}`
            );
        }

        // Get DEK service
        const dekService = getDekService();

        // Release the content
        console.log(
            `[REL] [${new Date().toISOString()}] [${requestId}] Releasing content with finalHash: ${finalHash}`
        );
        const decryptedContent = await dekService.release(finalHash, undefined, localEncryptedContents);

        // Store transaction hash
        storeTransaction(requestId, { hash: finalHash });

        console.log(`[REL] [${new Date().toISOString()}] [${requestId}] Content released successfully`);
        return res.json({
            success: true,
            requestId,
            decryptedContent,
            transactionHash: finalHash,
            signerAddress
        });
    } catch (error) {
        console.error(`[REL] [${new Date().toISOString()}] [${requestId}] Error releasing content:`, error);
        return res.status(500).json({
            success: false,
            error: "Failed to release content",
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
