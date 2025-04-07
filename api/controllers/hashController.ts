import { Request, Response } from "express";
import { getContract } from "../services/walletService";

export const getHash = async (req: Request, res: Response) => {
    try {
        const { content } = req.body;

        if (!content) {
            console.error(`[HASH] [${new Date().toISOString()}] Missing content in request`);
            return res.status(400).json({
                success: false,
                error: "Missing content in request"
            });
        }

        // Get contract
        const contract = getContract();

        // Get hash for content
        console.log(`[HASH] [${new Date().toISOString()}] Getting hash for content with length: ${content.length}`);
        const hash = await contract.getHashForCharacter(content);

        console.log(`[HASH] [${new Date().toISOString()}] Hash generated successfully`);
        return res.json({
            success: true,
            hash
        });
    } catch (error) {
        console.error(`[HASH] [${new Date().toISOString()}] Error generating hash:`, error);
        return res.status(500).json({
            success: false,
            error: "Failed to generate hash",
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
